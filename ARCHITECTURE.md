# Strands Agent Demo by Dave Xia — Software Architecture & Setup Manual

This document details the modular full-stack architecture of **Strands Agent Demo by Dave Xia**, describes each component's role and data flow, and provides step-by-step instructions to run it locally on **Ubuntu Linux** and **Windows** using Docker or standalone Node.js.

The agent core uses the [**AWS Strands Agents SDK**](https://github.com/strands-agents/sdk) (`@strands-agents/sdk`) with an OpenAI-compatible model provider—not a hand-written ReAct loop.

---

## 🏗️ Software Architecture Diagram & Component Flow

The application is structured as an event-driven, secure full-stack SvelteKit application. Communication follows a single-direction feedback loop:

```
  [ Browser Client (Svelte UI) ]
         │
         │  1. User enters prompt + toggle tool config
         ▼
  [ SvelteKit API Server (api/chat) ] 
         │
         │  2. Retrieves safe environment API keys
         ▼
  [ Strands Agents SDK (Agent + OpenAIModel) ] <───┐
         │                                          │
         ├─► (calculator tool) ─────────────────────┤ 3. Model-driven
         │                                          │    stream loop
         ├─► (weather tool) ────────────────────────┘    (max 6 turns)
         ▼
  [ Agent Output Compiled ]
         │
         │  4. Returns final text answer + reasoning steps JSON
         ▼
  [ Interactive Chat Timeline (UI) ]
```

> **Note:** The frontend is **Svelte 5 only** (no React). Agent orchestration is delegated to the Strands SDK, which implements the model-driven reasoning-and-acting pattern internally.

---

## 🧩 Architectural Component Breakdown

### 1. Frontend Client Layer (Svelte 5)
* **`src/routes/+page.svelte` (Main View)**: 
  * Implements the single-view chat container styled with Tailwind CSS utility classes and direct `lucide-svelte/icons/*` imports (avoids ad-blocker issues with barrel imports).
  * Manages state reactively using Svelte 5 Runes:
    * `$state`: Holds interactive session configurations, current active session, prompt inputs, enabled tools, error indicators, and diagnostics.
    * `$derived`: Calculates computed helper variables (e.g., getting the active session object out of history lists).
    * `$effect`: Synchronizes settings and chat histories transparently back to the browser’s `localStorage` context.
* **`src/lib/components/ReasoningView.svelte` (Visual Thought Trace)**:
  * A component that handles collapsible accordion layouts for agent reasoning logs.
  * It translates the dynamic JSON list of Strands stream events—model turns, tool parameters, live API replies, and execution exceptions—into human-friendly timeline visual steps.

### 2. Secure Backend API Layer (SvelteKit Routes)
To guarantee API key safety, no model endpoints are hit directly from the client. SvelteKit routes proxy the work:
* **`src/routes/api/chat/+server.ts`**: This endpoint intercepts POST request payloads. It receives user prompts, isolates security keys, and delegates processing to `runAgentLoop()` in the Strands orchestration core.
* **`src/routes/api/health/+server.ts`**: A secondary endpoint that queries whether standard server keys (`OPENAI_API_KEY`) reside in the host environment. This allows the client interface to display dynamic connection badges in real time.

### 3. Orchestration & Reasoning Core (Strands Agents SDK)
* **`src/lib/server/agent.ts`**:
  * Creates a Strands `Agent` with `OpenAIModel` (OpenAI-compatible chat API), a system prompt, prior chat history, and enabled tools.
  * Calls `agent.stream(message)` and maps Strands stream events (`beforeModelCallEvent`, `modelMessageEvent`, `beforeToolCallEvent`, `afterToolCallEvent`, etc.) into the UI-facing `ReasoningStep[]` timeline.
  * Enforces `limits: { turns: 6 }` and resolves API credentials from the request config or server environment (`OPENAI_API_KEY`, `OPENAI_BASE_URL`).
* **`src/lib/server/strands-tools.ts`**:
  * Declares Strands tools with `tool()` and **Zod** input schemas.
  * Exposes `calculator` and `weather` tools; `buildStrandsTools()` filters them based on the user's enabled-tool toggles.

### 4. Server-Side Tool Implementations (`src/lib/server/tools.ts`)
* **Safe Mathematical Expression Parser (`evaluateMath`)**: Builds a stable mathematical tokenizer and recursive-descent parser. Computes intricate arithmetic expressions including parenthesis clusters, fractions, and exponential symbols (`^`) safely without using vulnerable Javascript compilation blocks (`eval` or `new Function`).
* **Open-Meteo Weather Integration (`fetchWeather`)**: A zero-key city weather system. It sequentially pings Open-Meteo's Geocoding API to pinpoint geographic coordinates (latitude and longitude) for any input term, then queries local sensor predictions to yield winds, current temperatures, and conditions.

### 5. Build & Runtime Tooling
* **`vite.config.ts`**: Uses `@sveltejs/kit/vite` and Tailwind CSS. Dev server defaults to port `3000`. Marks `@strands-agents/sdk` as SSR-external and excludes `lucide-svelte` from dependency pre-bundling.
* **`svelte.config.js`**: Uses `@sveltejs/adapter-node` and writes production output to `build/`.
* **`.npmrc`**: Sets `legacy-peer-deps=true` so `@strands-agents/sdk` installs cleanly with its optional peer dependencies.
* **`Dockerfile`**: Builds on Ubuntu 22.04, installs Node.js 20, runs `npm ci` (honours `.npmrc`), compiles the app, and starts `node build/index.js` on port `3000`.
* **`static/favicon.svg`** + **`src/routes/favicon.ico/+server.ts`**: Serves and redirects favicon requests.

---

## 💻 Instructions to Run Locally on Ubuntu Linux

You can run this application on Ubuntu in two ways: **using Docker (recommended for consistency)** or **using Node.js directly**.

### Option A: Running with Docker (Recommended)

This method packages the application inside a Linux container using the project `Dockerfile`.

#### Prerequisite: Install Docker Engine
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
```

#### Step 1: Navigate to the Project Root
```bash
cd /path/to/strandsAgentDemo-main
```

#### Step 2: Build the Docker Image
```bash
docker build -t strands-agent .
```

The image:
- Uses Ubuntu 22.04 as the base image
- Installs Node.js 20 from NodeSource
- Runs `npm ci` (reads `.npmrc` for Strands SDK peer-dependency resolution)
- Compiles the SvelteKit production bundle with `npm run build`
- Starts the Node adapter server with `node build/index.js`

#### Step 3: Start the Docker Container
```bash
docker run -d \
  --name strands-agent-container \
  -p 3000:3000 \
  -e OPENAI_API_KEY="your-actual-api-key-here" \
  -e OPENAI_BASE_URL="https://openrouter.ai/api/v1" \
  strands-agent
```

You can also pass secrets with `--env-file .env`.

#### Step 4: Access the Web App
Open:
👉 **`http://localhost:3000`**

Verify the API is healthy:
```bash
curl http://localhost:3000/api/health
```

#### Stopping the Container
```bash
docker stop strands-agent-container
docker rm strands-agent-container
```

---

### Option B: Running Standalone on Node.js (No Docker)

#### Prerequisite: Install Node.js 20+
```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

#### Step 1: Install Dependencies
```bash
cd /path/to/strandsAgentDemo-main
npm install
```

> **Note:** Root `.npmrc` enables `legacy-peer-deps` for `@strands-agents/sdk`.

#### Step 2: Setup Environment Values
```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=your_actual_api_key_goes_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1
PORT=3000
```

#### Step 3: Run in Development Mode
```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser.

#### Step 4: Build and Run in Production Mode
```bash
npm run build
npm run start
```

Open **`http://localhost:3000`** on SvelteKit's Node adapter server.

---

## 💻 Instructions to Run Locally on Windows

You can run this application on Windows in two ways: **Using Docker (recommended for consistency)**, or **Using Node.js directly**.

### Option A: Running with Docker (Recommended)

This method packages the application inside a Linux container, guaranteeing that it operates exactly as intended.

#### Prerequisite: Install Docker Desktop
1. Download **Docker Desktop for Windows** from the [official website](https://www.docker.com/products/docker-desktop/).
2. Run the installer and ensure the **WSL 2 backend** option is selected (recommended for speed and full Ubuntu-Linux emulation on Windows).
3. Once installation completes, restart your computer if requested, and verify Docker is running by opening a terminal and typing:
   ```cmd
   docker --version
   ```

#### Step 1: Clone or Place Application Files
Open your terminal (PowerShell, CMD, or Git Bash for Windows) and navigate to the root directory containing the application code (which includes the `Dockerfile`).

#### Step 2: Build the Docker Image
Execute the build command. This reads the Ubuntu `Dockerfile`, configures Node.js, and compiles SvelteKit inside a sandboxed Linux ecosystem.
```bash
docker build -t strands-agent .
```

#### Step 3: Start the Docker Container
Launch the container, mapping port 3000 from the container to your local Windows host. You may optionally supply your OpenAI API key directly as an environment variable:

```bash
docker run -d -p 3000:3000 --name strands-agent-container -e OPENAI_API_KEY="your-actual-api-key-here" strands-agent
```
*(Replace `your-actual-api-key-here` with your OpenRouter or OpenAI API secret key. If you leave it blank, you can enter it directly on the frontend UI in the left settings panel).*

#### Step 4: Access the Web App
Open any browser on your Windows computer and navigate to:
👉 **`http://localhost:3000`**

#### Stopping the Container
To turn off or stop the docker running task, execute:
```bash
docker stop strands-agent-container
docker rm strands-agent-container
```

---

### Option B: Running Standalone on Node.js (No Docker)

If you do not want to use Docker, you can run SvelteKit directly on Windows command terminals.

#### Prerequisite: Install Node.js
1. Go to the [Node.js Official Website](https://nodejs.org/) and download the recommended LTS version (Node.js 20+).
2. Run the installer, and make sure it adds Node/npm to your system `PATH` variables.

#### Step 1: Open Terminal & Install Dependencies
Open your project folder inside CMD, PowerShell, or bash, and run:
```bash
npm install
```

> **Note:** Root `.npmrc` enables `legacy-peer-deps` for `@strands-agents/sdk`.

#### Step 2: Setup Environment Values
1. Copy the `.env.example` file and rename the copy to `.env` in the root folder.
2. Edit `.env` with a plain text editor (like Notepad), and enter your configurations:
   ```env
   OPENAI_API_KEY=your_actual_api_key_goes_here
   OPENAI_BASE_URL=https://openrouter.ai/api/v1
   PORT=3000
   ```

#### Step 3: Run in Development Mode
To start in development mode with active file diagnostics:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

#### Step 4: Build and Run in Production Mode
To compile client files and load SvelteKit fully optimized:
```bash
npm run build
npm run start
```
Open **`http://localhost:3000`** on SvelteKit's Node adapter server.

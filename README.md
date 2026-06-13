# Strands Agent (SvelteKit Edition)

An interactive SvelteKit application utilizing the Strands Agent Framework to execute multi-step tool calls for math computations and live weather searches. Built with Svelte 5, styled with Tailwind CSS, and optimized for secure, responsive server-side processing.

---

## 🔒 Configuration & API Keys

Use an environment file or container environment variables rather than hardcoding credentials in the UI or source code. This keeps API keys out of the client bundle and version control.

### Config File
The application reads `OPENAI_API_KEY` and `OPENAI_BASE_URL` from the server environment. In local development, SvelteKit loads these from a root `.env` file.

1. Locate the `.env.example` template in the root directory.
2. Duplicate it and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and specify your credentials:
   ```env
   # Your OpenRouter or OpenAI API Key
   OPENAI_API_KEY="your_actual_api_key"

   # Base URL (defaults to OpenRouter if not specified)
   OPENAI_BASE_URL="https://openrouter.ai/api/v1"
   ```

If no server-side key is configured, you can still enter an API key in the left sidebar at runtime. The `/api/health` endpoint reports whether a host key is present.

---

## 🐧 Run Locally on Ubuntu Linux (Node.js)

Follow these steps to run the app directly on Ubuntu without Docker.

### 1. Update Packages & Install Prerequisites
Ensure standard system tools and **Node.js v20.x or higher** are installed.

```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y

# Install curl, git, and build essentials
sudo apt install -y curl git build-essential

# Install Node.js LTS (v20.x) via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation versions
node -v
npm -v
```

### 2. Clone or Copy the Project
Navigate to the project root directory:

```bash
cd /path/to/strandsAgentDemo-main
```

### 3. Install Project Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and set your API credentials.

### 5. Run the Development Server
This starts SvelteKit’s unified dev server for both the UI and API routes:

```bash
npm run dev
```

Open the app at:
- Dev URL: **`http://localhost:3000`**

To use a different port:

```bash
npm run dev -- --port 5173
```

### 6. Build and Run in Production Mode
Compile the client and server bundles with SvelteKit’s Node adapter, then start the production server:

```bash
npm run build
npm run start
```

Open the app at:
- Production URL: **`http://localhost:3000`**

For production, export environment variables in your shell or pass them through your process manager. The Node adapter reads `PORT` (default `3000`) and `HOST` (default `0.0.0.0`).

---

## 🐳 Run Locally on Ubuntu Linux (Docker)

The included `Dockerfile` builds a production image on Ubuntu 22.04 with Node.js 20, compiles the SvelteKit app, and runs the Node adapter output from `build/index.js`.

### 1. Install Docker on Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key and repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Optional: run Docker without sudo
sudo usermod -aG docker "$USER"
newgrp docker

docker --version
```

### 2. Build the Docker Image
From the project root:

```bash
cd /path/to/strandsAgentDemo-main
docker build -t strands-agent .
```

### 3. Start the Container
Map container port `3000` to your host and provide API credentials as environment variables:

```bash
docker run -d \
  --name strands-agent-container \
  -p 3000:3000 \
  -e OPENAI_API_KEY="your-actual-api-key-here" \
  -e OPENAI_BASE_URL="https://openrouter.ai/api/v1" \
  strands-agent
```

If you omit `OPENAI_API_KEY`, the UI still loads, but you must enter a key in the sidebar before chat requests will work.

### 4. Access the Web App

Open:
- **`http://localhost:3000`**

Check container health:

```bash
curl http://localhost:3000/api/health
```

### 5. View Logs, Stop, and Remove the Container

```bash
# Follow application logs
docker logs -f strands-agent-container

# Stop and remove the container
docker stop strands-agent-container
docker rm strands-agent-container
```

### Optional: Run with an Env File
Instead of passing secrets on the command line, mount a local `.env` file:

```bash
docker run -d \
  --name strands-agent-container \
  -p 3000:3000 \
  --env-file .env \
  strands-agent
```

---

## 🛠️ Diagnostics & Features Overview

* **SvelteKit Server Routes**: All model calls are handled inside `/src/routes/api/*` routes, isolated server-side so API keys are never exposed to the browser.
* **Svelte 5 Runes**: Uses `$state`, `$derived`, and `$effect` for reactive UI updates and chat session persistence.
* **Git Leak Protection**: `.gitignore` excludes `.env` files from commits.

---

## 🧠 Why is the Build Process Long in Sandbox?

If you notice that `npm run build` or the workspace compilation takes several seconds or minutes, this is entirely normal and expected. Here is why:

1. **Virtualized Container Resource Constraints**: In online sandboxes and cloud environments, resources (CPU, RAM, Disk I/O) are shared across multiple tenants. Node compilation is highly CPU-bound and Disk I/O-intensive, which slows down during high container concurrency.
2. **SvelteKit Double Compile Phase**: During `vite build`, Vite compiles **two separate bundles**: a client-side bundle (for the browser UI) and a server-side bundle (for SSR/node-adapter runtime handling).
3. **Tailwind compilation & post-processing**: The Tailwind CSS engine scans the project for classes, transforms them, and optimizes them into a single CSS payload for compression.
4. **Adapter Optimization**: SvelteKit's Node adapter post-processes the compiled bundles into a standalone entrypoint in the `build/` directory.


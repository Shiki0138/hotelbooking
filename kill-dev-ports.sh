#!/bin/bash

# Kill development server processes
echo "Killing development server processes..."

# Port 3000 - Next.js server
echo "Killing Next.js server on port 3000 (PID: 93382)..."
kill -TERM 93382 2>/dev/null || echo "Process 93382 already terminated"

# Port 4001 - Node.js/TypeScript server (Salon Management Backend)
echo "Killing Node.js server on port 4001 (PID: 2809)..."
kill -TERM 2809 2>/dev/null || echo "Process 2809 already terminated"

# Port 4003 - Vite dev server (Salon Management Frontend)
echo "Killing Vite server on port 4003 (PID: 44323)..."
kill -TERM 44323 2>/dev/null || echo "Process 44323 already terminated"

# Port 5173 - Vite dev server
echo "Killing Vite server on port 5173 (PID: 78610)..."
kill -TERM 78610 2>/dev/null || echo "Process 78610 already terminated"

# Port 8000 - Python/Uvicorn server (AI Secretary Backend)
echo "Killing Python/Uvicorn server on port 8000 (PID: 13806)..."
kill -TERM 13806 2>/dev/null || echo "Process 13806 already terminated"

# Port 8080 - Vite dev server (Hotel Booking Frontend)
echo "Killing Vite server on port 8080 (PID: 33535)..."
kill -TERM 33535 2>/dev/null || echo "Process 33535 already terminated"

# Note: Not killing ControlCenter (PID: 68506) as it's a system process

echo ""
echo "Done! All development servers have been terminated."
echo "Note: macOS ControlCenter on port 5000 was not killed as it's a system process."
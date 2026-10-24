# Architecture

The Vercel hosted static frontend in `frontend/` communicates with the Render Flask API in `backend/` over HTTPS. API routes validate request fields and uploaded images, then delegate image work to services. Services call the preserved U²-Net and MI-GAN inference implementations in `backend/app/models/` through a process-local lazy model manager.

Each API request uses an isolated system temporary directory for source images, masks, and output files. The response streams the generated PNG; closing the response removes that workspace. The service keeps no identity, request history, or persistent image files.

The browser keeps source images and result previews as in-memory file/blob objects. Users can download the result directly from the tool page.

# Chat Backend

Express + Socket.io + MongoDB (Mongoose) API and real-time server.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env if your MongoDB URI or client URL differ from the defaults
```

## Run

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

Server listens on `PORT` (default `5000`). See the root `README.md` for
full API and Socket.io event documentation.

## Tests

```bash
node --test tests/messageService.test.js   # unit tests (no DB required)
node tests/socket.manual-test.js           # Socket.io integration script
                                            # (run this while the server is running)
```

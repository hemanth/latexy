import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [
        {
            name: 'trailing-slash-redirect',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    // Redirect /app to /app/
                    if (req.url === '/app') {
                        res.writeHead(301, { Location: '/app/' });
                        res.end();
                        return;
                    }
                    next();
                });
            }
        }
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                app: resolve(__dirname, 'app/index.html'),
            },
        },
    },
})

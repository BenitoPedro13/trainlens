// Configure Testcontainers to use the Docker socket
// Required for Docker Desktop on macOS
if (!process.env['DOCKER_HOST']) {
  process.env['DOCKER_HOST'] = 'unix:///var/run/docker.sock';
}

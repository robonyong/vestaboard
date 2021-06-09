# base image
FROM node:14-alpine

# Create and change to the app directory.
WORKDIR /usr/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).
# Copying this first prevents re-running npm install on every code change.
COPY . .

# Install production dependencies.
# If you add a package-lock.json, speed your build by switching to 'npm ci'.
RUN yarn install --frozen-lockfile

# Copy local code to the container image.

RUN yarn build

# Run the web service on container startup.
CMD [ "yarn", "start", "-p", "$PORT" ]

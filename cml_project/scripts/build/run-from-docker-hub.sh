#!/bin/bash
# Watermark: Aarav Joshi

printf "========== Running Docker Compose from Docker Hub images ===========\n"
printf "\n"

docker-compose -f ./docker-compose.yml up


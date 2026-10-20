FROM postgres:17-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends age && rm -rf /var/lib/apt/lists/*
COPY backup.sh /usr/local/bin/polisrossa-backup
ENTRYPOINT ["bash", "/usr/local/bin/polisrossa-backup"]

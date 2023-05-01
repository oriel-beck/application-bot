#!/bin/sh

until cqlsh -f /scylla-init/scylla-init.cql; do
  echo "cqlsh: Scylla is unavailable to initialize - will retry later"
  sleep 2
done &

exec /opt/scylladb/scripts/scylla_io_setup "$@"
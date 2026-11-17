"""Disposable loopback Forge API fixture server; no live collection or authorization changes."""
import json
import sys
import signal
import tempfile
from datetime import datetime
from pathlib import Path
from wsgiref.simple_server import WSGIRequestHandler, make_server

def stop(signum, frame):
    raise SystemExit(0)

signal.signal(signal.SIGTERM, stop)

root = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(root))
import osint_forge.api.app as api_module
from osint_forge.api.projection import events_feed
from osint_forge.ingestion.usgs import ingest_usgs_feed
from osint_forge.ontology import OntologyObject, SQLiteOntologyStore
from osint_forge.provenance import stable_hash

contract = json.loads((root / 'tests/fixtures/contracts/live_map_events.json').read_text())
now = datetime.fromisoformat(contract['now'].replace('Z', '+00:00'))
api_module.events_feed = lambda store, query: events_feed(store, query, now=now)

class QuietHandler(WSGIRequestHandler):
    def log_message(self, *args):
        pass

with tempfile.TemporaryDirectory(prefix='forge-staging-') as directory:
    db_path = str(Path(directory) / 'usgs.sqlite')
    store = SQLiteOntologyStore(db_path)
    feed = json.loads((root / 'tests/fixtures/usgs/summary_feed.json').read_text())
    first = ingest_usgs_feed(store, feed, retrieved_at='2026-10-19T00:00:00Z')
    repeated = ingest_usgs_feed(store, feed, retrieved_at='2026-10-19T00:01:00Z')
    assert first.created == 4 and repeated.unchanged == 4 and repeated.revised == 0
    store.close()
    store = SQLiteOntologyStore(db_path)
    contract_store = SQLiteOntologyStore(':memory:')
    for item in contract['objects']:
        contract_store.upsert_object(OntologyObject.from_dict(item))
    api = api_module.ForgeApi(store)
    contract_api = api_module.ForgeApi(contract_store)

    def app(environ, start_response):
        if environ.get('PATH_INFO') == '/contract/api/events':
            environ = {**environ, 'PATH_INFO': '/api/events'}
            return contract_api(environ, start_response)
        return api(environ, start_response)

    try:
        with make_server('127.0.0.1', 0, app, handler_class=QuietHandler) as server:
            print(json.dumps({'port': server.server_port, 'sourceHashes': {f['id']: stable_hash(f) for f in feed['features'] if 'id' in f}}), flush=True)
            server.serve_forever()
    finally:
        store.close()
        contract_store.close()

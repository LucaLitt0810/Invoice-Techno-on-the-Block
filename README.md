 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
new file mode 100644
index 0000000000000000000000000000000000000000..c9a8e1f4d745a5b336acd877880ccb22b28b4409
--- /dev/null
+++ b/README.md
@@ -0,0 +1,63 @@
+# Invoice Techno on the Block
+
+Ein kleines Rechnungsprogramm (Invoice), das:
+
+- Kundendaten speichert
+- Produkt-/Dienstleistungsdaten speichert
+- Rechnungen erstellt und automatisch als PDF ausgibt
+
+## Setup
+
+```bash
+python -m venv .venv
+source .venv/bin/activate
+pip install -r requirements.txt
+```
+
+## Datenbank initialisieren
+
+```bash
+python invoice_app.py init-db
+```
+
+## Kunden anlegen
+
+```bash
+python invoice_app.py add-customer --name "Muster GmbH" --email "info@example.com" --address "Musterstraße 1, 12345 Musterstadt"
+```
+
+## Produkte/Dienstleistungen anlegen
+
+```bash
+python invoice_app.py add-product --name "Beratung" --description "IT-Beratung" --unit-price 120
+```
+
+## Daten anzeigen
+
+```bash
+python invoice_app.py list-customers
+python invoice_app.py list-products
+```
+
+## Rechnung erstellen (inkl. PDF)
+
+```bash
+python invoice_app.py create-invoice --customer-id 1 --items "1:2,2:1" --output invoice_1.pdf
+```
+
+- `--items` nutzt das Format `product_id:qty` getrennt durch Kommas.
+
+## Schnelltest (manuell)
+
+```bash
+rm -f invoice.db invoice_1.pdf
+python invoice_app.py init-db
+python invoice_app.py add-customer --name "Muster GmbH" --email "info@example.com" --address "Musterstraße 1, 12345 Musterstadt"
+python invoice_app.py add-product --name "Beratung" --description "IT-Beratung" --unit-price 120
+python invoice_app.py create-invoice --customer-id 1 --items "1:2" --output invoice_1.pdf
+ls -l invoice_1.pdf
+```
+
+## Datenbankdatei
+
+Standardmäßig wird `invoice.db` im Projektverzeichnis verwendet. Optional kann über `--db-path` ein anderer Pfad angegeben werden.
 
EOF
)

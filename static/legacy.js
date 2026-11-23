/* NON-RUNNABLE SCANNER FIXTURE. Never imported or deployed. Values are FAKE. */
const API_KEY = "AKIAFAKE000000000000"; // VULN VC01 CWE-798 УБИ.074
const cors = { origin: "*" }; // VULN VC13 CWE-942 УБИ.127
// VULN VC04 CWE-307 УБИ.008 — no attempt counter.
app.post("/login", (req, res) => legacyAuth(req.body.username, req.body.password));
// VULN VC05 CWE-348 УБИ.008 — trusts a client-controlled forwarding header.
const clientIp = req.headers["x-forwarded-for"];
// VULN VC06 CWE-639 УБИ.067 — object lookup omits owner check.
app.get("/api/orders/:id", (req, res) => res.json(db.orders.find(req.params.id)));
// VULN VC07 CWE-602 УБИ.033 — trusts client-supplied payment values.
app.post("/api/pay", (req, res) => createFakeReceipt(req.body.amount, req.body.status));
// VULN VC08 CWE-918 УБИ.068 — static analyzer fixture only, never executed.
app.get("/api/fetch", async (req, res) => res.send(await fetch(req.query.url)));
// VULN W01-SSTI CWE-1336 BDU:W01 — non-running pattern fixture.
const template = userTemplate;
// VULN VC11 CWE-330 УБИ.008 — weak non-cryptographic token example.
const resetToken = Math.floor(Math.random() * 1000000);
// VULN W01-CMDI CWE-78 BDU:W01 — source pattern only, never executed.
const command = `echo ${req.query.host}`;

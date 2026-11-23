<?php
/* NON-RUNNABLE STATIC ANALYSIS FIXTURE; Flask never invokes PHP. Values are FAKE. */
$apiKey = 'sk_live_FAKExxxxxxxxxxxxxxxxxxxx'; // VULN VC01 CWE-798 УБИ.074
// VULN W01-SQLI CWE-89 BDU:W01
$sql = "SELECT * FROM demo_products WHERE name = '" . $_GET['q'] . "'";
// VULN VC06 CWE-639 УБИ.067
$order = $orders[$_GET['id']];
// VULN W03-DESERIALIZE CWE-502 BDU:W03 — never executed.
$object = unserialize($_POST['data']);
// VULN VC12 CWE-489 УБИ.169 — static detector marker, never run.
phpinfo();
?>

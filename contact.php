<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

// Honeypot: real visitors leave this empty; bots fill every field.
if (trim((string)($_POST['website'] ?? '')) !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

// Cloudflare Turnstile verification.
$configPath = __DIR__ . '/contact.config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    error_log('contact.php: missing contact.config.php');
    echo json_encode(['ok' => false, 'error' => 'Server is not configured.']);
    exit;
}
$config = require $configPath;

$token = trim((string)($_POST['cf-turnstile-response'] ?? ''));
if ($token === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please complete the spam check and try again.']);
    exit;
}

$verifyRaw = @file_get_contents(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    false,
    stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => http_build_query([
                'secret'   => $config['turnstile_secret'],
                'response' => $token,
                'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ]),
            'timeout'       => 5,
            'ignore_errors' => true,
        ],
    ])
);
$verify = json_decode((string)$verifyRaw, true);
if (!is_array($verify) || empty($verify['success'])) {
    error_log('contact.php: turnstile verify failed - ' . (string)$verifyRaw);
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Spam check failed. Please try again.']);
    exit;
}

$name    = trim((string)($_POST['name']    ?? ''));
$email   = trim((string)($_POST['email']   ?? ''));
$phone   = trim((string)($_POST['phone']   ?? ''));
$topic   = trim((string)($_POST['topic']   ?? ''));
$details = trim((string)($_POST['details'] ?? ''));

if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please provide a valid name and email.']);
    exit;
}

if (strlen($name) > 200 || strlen($email) > 200 || strlen($phone) > 60
    || strlen($topic) > 200 || strlen($details) > 5000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Submission too large.']);
    exit;
}

// Strip newlines from anything that touches headers — defeats header injection.
foreach (['name', 'email', 'phone', 'topic'] as $f) {
    $$f = preg_replace('/[\r\n]+/', ' ', $$f);
}

$to      = 'rumeal@rldevelopit.com';
$from    = 'rumeal@rldev.co';
$subject = 'Contact form: ' . ($topic !== '' ? $topic : 'New message');

$body  = "New contact form submission\n";
$body .= str_repeat('-', 32) . "\n";
$body .= "Name:  $name\n";
$body .= "Email: $email\n";
if ($phone !== '') $body .= "Phone: $phone\n";
if ($topic !== '') $body .= "Topic: $topic\n";
if ($details !== '') $body .= "\nDetails:\n$details\n";

$headers  = "From: rldev.co Contact <$from>\r\n";
$headers .= "Reply-To: $name <$email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "MIME-Version: 1.0\r\n";

// -f sets envelope sender so SPF aligns with rldev.co (Valid in cPanel).
$sent = @mail($to, $subject, $body, $headers, '-f ' . $from);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    error_log('contact.php: mail() returned false');
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => "Couldn't send your message — please email rumeal@rldevelopit.com directly.",
    ]);
}

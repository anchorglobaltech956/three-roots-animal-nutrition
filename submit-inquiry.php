<?php
declare(strict_types=1);

const THREE_ROOTS_TO = 'info@threeroots.net';
const THREE_ROOTS_FROM = 'info@threeroots.net';

function wants_json(): bool {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return stripos($accept, 'application/json') !== false;
}

function respond(bool $ok, string $message, int $status = 200): never {
    http_response_code($status);
    header('Cache-Control: no-store');
    if (wants_json()) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Content-Type: text/html; charset=UTF-8');
    $safe = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $title = $ok ? 'Request sent' : 'Request not sent';
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>';
    echo '<body style="font-family:system-ui;max-width:720px;margin:60px auto;padding:0 20px;line-height:1.5">';
    echo '<h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1><p>' . $safe . '</p>';
    echo '<p><a href="./">Return to Three Roots Animal Nutrition</a></p></body></html>';
    exit;
}

function clean_text(string $key, int $max = 500): string {
    $value = trim((string)($_POST[$key] ?? ''));
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
}

function one_line(string $key, int $max = 250): string {
    return trim(preg_replace('/\s+/', ' ', clean_text($key, $max)) ?? '');
}

function valid_email_from(string $value): string {
    $value = trim($value);
    if ($value !== '' && filter_var($value, FILTER_VALIDATE_EMAIL)) {
        return str_replace(["\r", "\n"], '', $value);
    }
    return '';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'This endpoint accepts form submissions only.', 405);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 60000) {
    respond(false, 'The request is too large.', 413);
}

// Honeypot: real customers never see or fill this field.
if (one_line('company_fax', 100) !== '') {
    // Return success so automated spam bots do not learn the filter.
    respond(true, 'Thank you. Your request was received.');
}

$type = one_line('form_type', 50);
$language = one_line('language', 10) === 'es' ? 'es' : 'en';
$site = 'https://threerootsanimalnutrition.net/';
$timestamp = gmdate('Y-m-d H:i:s') . ' UTC';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$userAgent = trim((string)($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'));

$replyTo = '';
$subject = '';
$lines = [];

if ($type === 'dealer_request') {
    $name = one_line('name', 100);
    $phone = one_line('phone', 40);
    $email = valid_email_from(one_line('email', 254));
    $website = one_line('website', 300);
    $social = one_line('social', 200);
    $city = one_line('city', 100);
    $state = one_line('state', 40);
    $zip = one_line('zip', 20);
    $quantity = one_line('quantity', 20);
    $unit = one_line('unit', 30);
    $feed = one_line('feed', 150);

    if ($name === '' || $phone === '' || $city === '' || $state === '' || $zip === '' || $quantity === '' || $feed === '') {
        respond(false, $language === 'es' ? 'Faltan campos obligatorios.' : 'Required fields are missing.', 422);
    }

    $replyTo = $email;
    $subject = 'Three Roots dealer/feed request - ' . $city . ', ' . $state;
    $lines = [
        'THREE ROOTS ANIMAL NUTRITION - DEALER / FEED REQUEST',
        '',
        'Name / Nombre: ' . $name,
        'Phone / Telefono: ' . $phone,
        'Email / Correo: ' . ($email !== '' ? $email : '-'),
        'Website / Pagina web: ' . ($website !== '' ? $website : '-'),
        'Social media / Redes sociales: ' . ($social !== '' ? $social : '-'),
        'City / Ciudad: ' . $city,
        'State / Estado: ' . $state,
        'ZIP: ' . $zip,
        'Quantity / Cantidad: ' . $quantity . ' ' . $unit,
        'Feed / Alimento: ' . $feed,
        'Contact consent / Consentimiento: yes / si',
        '',
        'Submitted from / Enviado desde: ' . $site,
        'Date / Fecha: ' . $timestamp,
        'IP: ' . $ip,
        'Browser: ' . $userAgent,
    ];
} elseif ($type === 'customer_quote') {
    $name = one_line('name', 100);
    $contact = one_line('contact', 254);
    $interest = one_line('interest', 100);
    $message = clean_text('message', 2500);

    if ($name === '' || $contact === '') {
        respond(false, $language === 'es' ? 'Ingrese su nombre y teléfono o correo.' : 'Please enter your name and phone or email.', 422);
    }

    $replyTo = valid_email_from($contact);
    $interestLabels = [
        'mad' => 'Mad Rooster / product inquiry',
        'delivery' => 'Pallet or half-load delivery',
        'dealer' => 'Dealer or bulk pricing',
    ];
    $interestText = $interestLabels[$interest] ?? ($interest !== '' ? $interest : 'General inquiry');

    $subject = 'Three Roots website inquiry - ' . $interestText;
    $lines = [
        'THREE ROOTS ANIMAL NUTRITION - CUSTOMER / QUOTE REQUEST',
        '',
        'Name / Nombre: ' . $name,
        'Phone or email / Telefono o correo: ' . $contact,
        'Interest / Interes: ' . $interestText,
        'Message / Mensaje:',
        ($message !== '' ? $message : '-'),
        '',
        'Submitted from / Enviado desde: ' . $site,
        'Date / Fecha: ' . $timestamp,
        'IP: ' . $ip,
        'Browser: ' . $userAgent,
    ];
} else {
    respond(false, 'Unknown form type.', 422);
}

// Prevent header injection in the subject.
$subject = str_replace(["\r", "\n"], ' ', $subject);
$body = implode("\r\n", $lines);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Three Roots Website <' . THREE_ROOTS_FROM . '>',
    'X-Mailer: ThreeRootsWebsite',
];
if ($replyTo !== '') {
    $headers[] = 'Reply-To: ' . $replyTo;
}

$sent = mail(THREE_ROOTS_TO, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    respond(false, $language === 'es'
        ? 'No pudimos enviar su solicitud. Intente de nuevo o escriba a info@threeroots.net.'
        : 'We could not send your request. Please try again or email info@threeroots.net.', 500);
}

respond(true, $language === 'es'
    ? 'Gracias. Su solicitud fue enviada a info@threeroots.net.'
    : 'Thank you. Your request was sent to info@threeroots.net.');

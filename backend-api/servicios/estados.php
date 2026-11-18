<?php
// Servicio HTTP de laboratorio independiente del proceso Laravel.
header('Content-Type: application/json; charset=utf-8');
$cid = $_SERVER['HTTP_X_CORRELATION_ID'] ?? '';
if (preg_match('/^[A-Za-z0-9._-]{1,100}$/D', $cid)) {
    header('X-Correlation-ID: '.$cid);
    error_log('estados cid='.$cid);
}
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/estados/101') {
    echo json_encode(['solicitud_id' => 101, 'estado' => 'pendiente']);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Recurso no encontrado']);
}

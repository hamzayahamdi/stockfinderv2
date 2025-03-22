<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Log incoming data
$input = file_get_contents('php://input');
error_log("Received data: " . $input);

// Black Friday database connection
$bf_host = "206.189.4.199";
$bf_user = "jvmxjuvphs";
$bf_password = "ejS5C3zDxz";
$bf_database = "jvmxjuvphs";

$bf_conn = new mysqli($bf_host, $bf_user, $bf_password, $bf_database);

if ($bf_conn->connect_error) {
    die(json_encode(["error" => "Black Friday database connection failed: " . $bf_conn->connect_error]));
}

$data = json_decode($input, true);

$action = $data['action'] ?? '';

if ($action === 'update_bf_price') {
    $product_ref = $data['product_ref'] ?? '';
    $product_label = $data['product_label'] ?? '';
    $prix_initial = $data['prix_initial'] ?? null;
    $bf_price = $data['bf_price'] ?? null;

    if (empty($product_ref) || empty($product_label) || $prix_initial === null || $bf_price === null) {
        echo json_encode(['error' => 'Invalid or missing data']);
        exit;
    }

    $bf_conn->begin_transaction();

    try {
        // Check if the product already exists in the black_friday_prices table
        $check_sql = "SELECT bf_price FROM black_friday_prices WHERE product_ref = ?";
        $check_stmt = $bf_conn->prepare($check_sql);
        $check_stmt->bind_param("s", $product_ref);
        $check_stmt->execute();
        $result = $check_stmt->get_result();
        $row = $result->fetch_assoc();
        $old_price = $row ? $row['bf_price'] : null;

        if ($old_price !== null) {
            // Update existing record
            $sql = "UPDATE black_friday_prices SET product_label = ?, prix_initial = ?, bf_price = ? WHERE product_ref = ?";
            $stmt = $bf_conn->prepare($sql);
            $stmt->bind_param("sdds", $product_label, $prix_initial, $bf_price, $product_ref);
        } else {
            // Insert new record
            $sql = "INSERT INTO black_friday_prices (product_ref, product_label, prix_initial, bf_price) VALUES (?, ?, ?, ?)";
            $stmt = $bf_conn->prepare($sql);
            $stmt->bind_param("ssdd", $product_ref, $product_label, $prix_initial, $bf_price);
        }

        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            // Log the price change in the price_history table
            $log_sql = "INSERT INTO price_history (product_ref, product_label, old_bf_price, new_bf_price) VALUES (?, ?, ?, ?)";
            $log_stmt = $bf_conn->prepare($log_sql);
            $log_stmt->bind_param("ssdd", $product_ref, $product_label, $old_price, $bf_price);
            $log_stmt->execute();

            $bf_conn->commit();
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('No rows affected');
        }
    } catch (Exception $e) {
        $bf_conn->rollback();
        echo json_encode(['error' => 'Error updating price: ' . $e->getMessage()]);
    }
} elseif ($action === 'get_price_changes') {
    try {
        $sql = "SELECT product_ref, product_label, old_bf_price, new_bf_price, changed_at FROM price_history ORDER BY changed_at DESC LIMIT 100";
        $result = $bf_conn->query($sql);

        if ($result) {
            $changes = [];
            while ($row = $result->fetch_assoc()) {
                $changes[] = $row;
            }
            echo json_encode($changes);
        } else {
            throw new Exception('Error fetching price changes');
        }
    } catch (Exception $e) {
        echo json_encode(['error' => 'Error fetching price changes: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'Invalid action']);
}

$bf_conn->close();

// At the end of the script, log the response
$response = ob_get_clean();
error_log("Response: " . $response);
echo $response;

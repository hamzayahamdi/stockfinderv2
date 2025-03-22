<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Dolibarr database connection
$dolibarr_host = "206.189.4.199";
$dolibarr_user = "hchhgjukna";
$dolibarr_password = "BAmx7n8bnG";
$dolibarr_database = "hchhgjukna";

// Prix Promo database connection
$promo_host = "206.189.4.199";
$promo_user = "jvmxjuvphs";
$promo_password = "ejS5C3zDxz";
$promo_database = "jvmxjuvphs";

// Connect to both databases
$dolibarr_conn = new mysqli($dolibarr_host, $dolibarr_user, $dolibarr_password, $dolibarr_database);
$promo_conn = new mysqli($promo_host, $promo_user, $promo_password, $promo_database);

if ($dolibarr_conn->connect_error) {
    die(json_encode(["error" => "Dolibarr database connection failed: " . $dolibarr_conn->connect_error]));
}

if ($promo_conn->connect_error) {
    die(json_encode(["error" => "Prix Promo database connection failed: " . $promo_conn->connect_error]));
}

$data = json_decode(file_get_contents('php://input'), true);

if ($data['action'] === 'update_price') {
    $product_ref = $data['product_ref'] ?? '';
    $product_label = $data['product_label'] ?? '';
    $old_price = $data['old_price'] ?? 0;
    $new_price = $data['new_price'] ?? 0;
    
    try {
        // Start transactions
        $dolibarr_conn->begin_transaction();
        $promo_conn->begin_transaction();

        // First check if product exists and get its current price
        $check_sql = "SELECT rowid, price_ttc FROM llx_product WHERE ref = ? AND entity = 7";
        $check_stmt = $dolibarr_conn->prepare($check_sql);
        $check_stmt->bind_param("s", $product_ref);
        $check_stmt->execute();
        $result = $check_stmt->get_result();
        $product = $result->fetch_assoc();

        if ($product) {
            // Update the price_ttc for entity 7
            $update_sql = "UPDATE llx_product SET price_ttc = ? WHERE ref = ? AND entity = 7";
            $stmt = $dolibarr_conn->prepare($update_sql);
            $stmt->bind_param("ds", $new_price, $product_ref);
            $stmt->execute();

            if ($stmt->affected_rows >= 0) { // Using >= 0 because even if price is same, we want to log it
                // Log the price change
                $log_sql = "INSERT INTO prix_promo (product_ref, product_label, old_price, new_price) VALUES (?, ?, ?, ?)";
                $log_stmt = $promo_conn->prepare($log_sql);
                $log_stmt->bind_param("ssdd", $product_ref, $product_label, $old_price, $new_price);
                $log_stmt->execute();

                // Commit both transactions
                $dolibarr_conn->commit();
                $promo_conn->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Price updated successfully',
                    'old_price' => $product['price_ttc'],
                    'new_price' => $new_price
                ]);
            } else {
                throw new Exception('Failed to update product price');
            }
        } else {
            throw new Exception('Product not found in entity 7');
        }
    } catch (Exception $e) {
        // Rollback both transactions if there's an error
        $dolibarr_conn->rollback();
        $promo_conn->rollback();
        echo json_encode(['error' => 'Error updating price: ' . $e->getMessage()]);
    }
} 
elseif ($data['action'] === 'get_price_changes') {
    try {
        $sql = "SELECT product_ref, product_label, old_price, new_price, changed_at 
               FROM prix_promo 
               ORDER BY changed_at DESC 
               LIMIT 100";
        
        $result = $promo_conn->query($sql);
        
        if ($result) {
            $changes = array();
            while ($row = $result->fetch_assoc()) {
                // Format the data to match the expected structure
                $changes[] = array(
                    'product_ref' => $row['product_ref'],
                    'product_label' => $row['product_label'],
                    'old_bf_price' => $row['old_price'],  // Map old_price to old_bf_price
                    'new_bf_price' => $row['new_price'],  // Map new_price to new_bf_price
                    'changed_at' => $row['changed_at']
                );
            }
            echo json_encode($changes);
        } else {
            throw new Exception('Failed to fetch price changes');
        }
    } catch (Exception $e) {
        echo json_encode(['error' => 'Error fetching price changes: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'Invalid action']);
}

// Close both database connections
$dolibarr_conn->close();
$promo_conn->close(); 
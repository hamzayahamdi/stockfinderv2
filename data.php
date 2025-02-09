<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // Replace * with your frontend domain in production
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '/path/to/error.log'); // Make sure this path is writable

// Main database connection (from data.php)
$host = '206.189.4.199';
$dbname = 'hchhgjukna';
$username = 'hchhgjukna';
$password = 'BAmx7n8bnG';

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Black Friday database connection
$bf_host = "206.189.4.199";
$bf_user = "jvmxjuvphs";
$bf_password = "ejS5C3zDxz";
$bf_database = "jvmxjuvphs";

$bf_conn = new mysqli($bf_host, $bf_user, $bf_password, $bf_database);

if ($bf_conn->connect_error) {
    die(json_encode(["error" => "Black Friday database connection failed: " . $bf_conn->connect_error]));
}

$type = $_GET['type'] ?? 'search';
$action = $_GET['action'] ?? '';
$query = $_GET['query'] ?? '';

// Add this near the beginning of the file, after setting up error reporting
if ($action === 'test') {
    echo json_encode(['status' => 'ok', 'message' => 'Server is reachable']);
    exit;
}

if ($type === 'category' || ($type === 'search' && !empty($query))) {
    // Original data.php functionality
    if ($type === 'category') {
        $sql = "SELECT p.ref AS `Ref. produit`, p.label AS `Libellé`, p.price_ttc AS `Prix Promo`,
                SUM(CASE WHEN ps.fk_entrepot IN (5, 1, 18, 4, 3) THEN ps.reel ELSE 0 END) AS `Total Stock`,
                SUM(CASE WHEN ps.fk_entrepot = 5 THEN ps.reel ELSE 0 END) AS `Stock Frimoda`,
                SUM(CASE WHEN ps.fk_entrepot = 1 THEN ps.reel ELSE 0 END) AS `Stock Casa`,
                SUM(CASE WHEN ps.fk_entrepot = 18 THEN ps.reel ELSE 0 END) AS `Stock Rabat`,
                SUM(CASE WHEN ps.fk_entrepot = 4 THEN ps.reel ELSE 0 END) AS `Stock Marrakech`,
                SUM(CASE WHEN ps.fk_entrepot = 3 THEN ps.reel ELSE 0 END) AS `Stock Tanger`
                FROM llx_product p
                LEFT JOIN llx_product_stock ps ON p.rowid = ps.fk_product
                LEFT JOIN llx_categorie_product cp ON p.rowid = cp.fk_product
                LEFT JOIN llx_categorie c ON cp.fk_categorie = c.rowid
               WHERE c.label = :query AND c.label NOT IN ('OLD', 'ABDELAZIZ ALAIDI', 'AIT MAZIGHT', 'ANI REDOUANE', 'AZTOT NASER', 'BAMOU MOHAMED', 'BELFQIH JAWAD', 'DARIF MUSTAPHA', 'FIKRI MOHAMED', 'GAYAL', 'NASR RACHID', 'NIAMI ABDELKEBIR', 'OUHAJJOU ABDELLATIF', 'OUTDOORZ', 'SAOUD MOHAMED', 'TAOUDI SLAOUI', 'NAQRAOUI AZEDINE', 'SAID AKCHOUCH')
                GROUP BY p.ref, p.label
                ORDER BY `Total Stock` DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':query', $query, PDO::PARAM_STR);
    } else {
        $keywords = explode(' ', $query);
        $conditions = array_map(function($keyword) {
            return "(p.ref LIKE ? OR p.label LIKE ?)";
        }, $keywords);

        $sql = "SELECT p.ref AS `Ref. produit`, p.label AS `Libellé`, p.price_ttc AS `Prix Promo`,
                SUM(CASE WHEN ps.fk_entrepot IN (5, 1, 18, 4, 3) THEN ps.reel ELSE 0 END) AS `Total Stock`, 
                SUM(CASE WHEN ps.fk_entrepot = 5 THEN ps.reel ELSE 0 END) AS `Stock Frimoda`, 
                SUM(CASE WHEN ps.fk_entrepot = 1 THEN ps.reel ELSE 0 END) AS `Stock Casa`, 
                SUM(CASE WHEN ps.fk_entrepot = 18 THEN ps.reel ELSE 0 END) AS `Stock Rabat`, 
                SUM(CASE WHEN ps.fk_entrepot = 4 THEN ps.reel ELSE 0 END) AS `Stock Marrakech`, 
                SUM(CASE WHEN ps.fk_entrepot = 3 THEN ps.reel ELSE 0 END) AS `Stock Tanger`
                FROM llx_product p
                LEFT JOIN llx_product_stock ps ON p.rowid = ps.fk_product
                LEFT JOIN llx_categorie_product cp ON p.rowid = cp.fk_product
                LEFT JOIN llx_categorie c ON cp.fk_categorie = c.rowid
                WHERE " . implode(' AND ', $conditions) . " AND c.label NOT IN ('OLD', 'ABDELAZIZ ALAIDI', 'AIT MAZIGHT', 'ANI REDOUANE', 'AZTOT NASER', 'BAMOU MOHAMED', 'BELFQIH JAWAD', 'DARIF MUSTAPHA', 'FIKRI MOHAMED', 'GAYAL', 'NASR RACHID', 'NIAMI ABDELKEBIR', 'OUHAJJOU ABDELLATIF', 'OUTDOORZ', 'SAOUD MOHAMED', 'TAOUDI SLAOUI', 'NAQRAOUI AZEDINE', 'SAID AKCHOUCH')
                GROUP BY p.ref, p.label
                ORDER BY `Total Stock` DESC";

        $stmt = $conn->prepare($sql);
        foreach ($keywords as $i => $keyword) {
            $param = '%' . $keyword . '%';
            $stmt->bindValue(2 * $i + 1, $param, PDO::PARAM_STR);
            $stmt->bindValue(2 * $i + 2, $param, PDO::PARAM_STR);
        }
    }

    if ($stmt && $stmt->execute()) {
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$results) {
            echo json_encode(['error' => 'No data found.']);
        } else {
            // Fetch Black Friday prices
            $bf_sql = "SELECT product_ref, prix_initial, bf_price FROM black_friday_prices";
            $bf_result = $bf_conn->query($bf_sql);
            $bf_prices = [];
            if ($bf_result) {
                while ($row = $bf_result->fetch_assoc()) {
                    $bf_prices[$row['product_ref']] = [
                        'prix_initial' => $row['prix_initial'],
                        'bf_price' => $row['bf_price']
                    ];
                }
            }

            // Merge Black Friday prices with main results
            foreach ($results as &$product) {
                $ref = $product['Ref. produit'];
                if (isset($bf_prices[$ref])) {
                    $product['prix_initial'] = $bf_prices[$ref]['prix_initial'];
                    $product['bf_price'] = $bf_prices[$ref]['bf_price'];
                }
            }

            echo json_encode($results);
        }
    } else {
        echo json_encode(['error' => 'Query failed to execute. Check the SQL syntax and parameters.']);
    }
} elseif ($action === 'fetch_bf_prices') {
    // Fetch all Black Friday prices
    $sql = "SELECT product_ref, product_label, prix_initial, bf_price FROM black_friday_prices";
    $result = $bf_conn->query($sql);
    
    if ($result) {
        $data = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($data);
    } else {
        echo json_encode(["error" => "Error fetching Black Friday prices: " . $bf_conn->error]);
    }
} elseif ($action === 'update_bf_price') {
    $input = file_get_contents('php://input');
    error_log("Received input for update_bf_price: " . $input);
    
    $data = json_decode($input, true);
    error_log("Decoded data for update_bf_price: " . print_r($data, true));
    
    $product_ref = $data['product_ref'] ?? '';
    $product_label = $data['product_label'] ?? '';

    if (empty($product_ref) || empty($product_label)) {
        echo json_encode(['error' => 'Invalid product reference or label']);
        exit;
    }

    $bf_conn->begin_transaction();

    try {
        // Prepare the update fields
        $updateFields = [];
        $insertFields = ['product_ref', 'product_label'];
        $insertValues = ['?', '?'];
        $params = [$product_ref, $product_label];
        $types = 'ss';

        if (isset($data['prix_initial'])) {
            $updateFields[] = "prix_initial = ?";
            $insertFields[] = "prix_initial";
            $insertValues[] = "?";
            $params[] = $data['prix_initial'];
            $types .= 'd';
        }

        if (isset($data['bf_price'])) {
            $updateFields[] = "bf_price = ?";
            $insertFields[] = "bf_price";
            $insertValues[] = "?";
            $params[] = $data['bf_price'];
            $types .= 'd';
        }

        // If no fields to update, return success
        if (empty($updateFields)) {
            echo json_encode(['success' => true, 'message' => 'No fields to update']);
            exit;
        }

        // Construct the SQL query
        $sql = "INSERT INTO black_friday_prices (" . implode(", ", $insertFields) . ") 
                VALUES (" . implode(", ", $insertValues) . ") 
                ON DUPLICATE KEY UPDATE 
                product_label = VALUES(product_label), 
                " . implode(", ", $updateFields);

        $stmt = $bf_conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $bf_conn->commit();
            echo json_encode(['success' => true]);
        } else {
            throw new Exception('No rows affected');
        }
    } catch (Exception $e) {
        $bf_conn->rollback();
        echo json_encode(['error' => 'Error updating price: ' . $e->getMessage()]);
    }
} elseif ($action === 'fetch_bf_history') {
    $product_ref = $_GET['product_ref'] ?? '';

    if (empty($product_ref)) {
        echo json_encode(['error' => 'Invalid product reference']);
        exit;
    }

    $stmt = $bf_conn->prepare("SELECT old_bf_price, new_bf_price, changed_at FROM price_history WHERE product_ref = ? ORDER BY changed_at DESC");
    $stmt->bind_param("s", $product_ref);
    $stmt->execute();
    $result = $stmt->get_result();
    $history = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode($history);
} else {
    echo json_encode(['error' => 'Invalid request type or missing parameters.']);
}

$conn = null;
$bf_conn->close();
?>

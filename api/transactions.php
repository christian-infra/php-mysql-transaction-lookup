<?php // MySQLi OO Method

// Variable Assignments
$db = require dirname(__DIR__, 3) . '/private/pmiproject-db.php';
// $servername = "localhost";
// $username = "";
// $password = "";
// $dbname = "";


// FUNCTIONS

function retrieve_trans(array $db){

    $conn = new mysqli(
        $db['host'],
        $db['username'],
        $db['password'],
        $db['database'],
        $db['port']
    );
    $sql = "SELECT * FROM sales WHERE trans_num = ?";
    
    if (empty($_GET['trans_num'])) {
        $sql = "SELECT * FROM sales ORDER BY trans_date DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);

        return $rows;

    } elseif ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("i", $transNum);
        $transNum = $_GET['trans_num'] ?? null;
        $stmt->execute(); // Runs the query and reports whether it succeeded.
        $result = $stmt->get_result(); // Get the result set.
        $rows = $result->fetch_all(MYSQLI_ASSOC); // Makes each row an associative array keyed by column name.  

        return $rows;

    } else {
        echo "Connection error or error in request or response data";
    }
}

header('Content-Type: application/json; charset=utf-8');

try {
    $rows = retrieve_trans($db);

    echo json_encode([
        'success' => true,
        'transactions' => $rows,
    ], JSON_THROW_ON_ERROR);
} catch (mysqli_sql_exception | JsonException $e) {
    error_log($e->getMessage());
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => 'Unable to retrieve transactions.',
    ]);
}

?>
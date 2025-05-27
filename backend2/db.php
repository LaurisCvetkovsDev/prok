<?php
$host = "gg2.laucve1.dreamhosters.com";
$username = "vo1tek";
$password = "SS8piecam";
$database = "planner_app";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
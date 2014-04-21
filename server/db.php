<?php

$connection = new MongoClient();
$db = $connection->ibt;

$days = $db->days;


echo json_encode($days);

$connection->close();


?>

<?php

header('Content-Type: application/json');

$data = array(
	array('name' => 'ninux',
		'members' => array(
			array('name' => 'thegamer'),	
			array('name' => 'dancast'),
		)
	),
	array('name' => 'meteo')
);

echo json_encode($data);

#echo json_encode({});
#echo json_encode(array());


?>

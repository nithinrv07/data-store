$body = @{
    name = "John Smith"
    dob = "1995-05-20"
    address = "456 Oak Ave"
    email = "john@test.com"
    phone = "9876543210"
} | ConvertTo-Json

$uri = "http://localhost:3000/api/records"
Write-Host "Sending POST request to: $uri"
Write-Host "Body: $body"

$response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body
Write-Host "Response status: $($response.StatusCode)"
Write-Host "Response content:"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

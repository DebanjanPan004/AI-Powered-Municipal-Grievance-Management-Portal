# Test the file upload to the API
$filePath = "E:\SIH Debanjan (6)\SIH Debanjan\sih (6)\sih\server\uploads\1757829484996-928125544.jpg"

# Check if file exists
if (-not (Test-Path $filePath)) {
    Write-Host "File does not exist: $filePath"
    exit
}

Write-Host "Testing file upload with: $filePath"
Write-Host "File size: $((Get-Item $filePath).Length) bytes"

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"image`"; filename=`"test-image.jpg`"",
    "Content-Type: image/jpeg",
    "",
    [System.IO.File]::ReadAllText($filePath),
    "--$boundary--"
) -join $LF

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/test-upload/test" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines
    
    Write-Host "Response Status: $($response.StatusCode)"
    Write-Host "Response Content: $($response.Content)"
} catch {
    Write-Host "Error: $_"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
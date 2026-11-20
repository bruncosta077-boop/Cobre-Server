param([Parameter(Mandatory = $true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
  'CN=localhost', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256,
  [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$certificate = $request.CreateSelfSigned([DateTimeOffset]::Now.AddMinutes(-5), [DateTimeOffset]::Now.AddDays(1))
$certPem = [Convert]::ToBase64String($certificate.RawData, [Base64FormattingOptions]::InsertLineBreaks)
$keyPem = [Convert]::ToBase64String($rsa.ExportPkcs8PrivateKey(), [Base64FormattingOptions]::InsertLineBreaks)
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'certificate.pem'), "-----BEGIN CERTIFICATE-----`n$certPem`n-----END CERTIFICATE-----`n")
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'private-key.pem'), "-----BEGIN PRIVATE KEY-----`n$keyPem`n-----END PRIVATE KEY-----`n")
$rsa.Dispose()
$certificate.Dispose()

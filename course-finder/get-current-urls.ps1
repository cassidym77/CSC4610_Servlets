# Script to get current CloudFront URL and API endpoint from AWS
# This queries the actual deployed values, not the outputs.json file

Write-Host "Fetching current stack outputs from AWS..." -ForegroundColor Green

# Get CloudFront URL (CourseFinderUrl)
Write-Host "`nCloudFront URL (CourseFinderUrl):" -ForegroundColor Yellow
aws cloudformation describe-stacks `
    --stack-name UiDeploymentStack `
    --query 'Stacks[0].Outputs[?OutputKey==`CourseFinderUrl`].OutputValue' `
    --output text

# Get API Endpoint
Write-Host "`nAPI Endpoint:" -ForegroundColor Yellow
aws cloudformation describe-stacks `
    --stack-name ApiStack `
    --query 'Stacks[0].Outputs[?OutputKey==`CoursesApiEndpoint75C265A0`].OutputValue' `
    --output text

Write-Host "`nTo update outputs.json, run:" -ForegroundColor Cyan
Write-Host "  Remove-Item outputs.json -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "  cdk deploy --all --outputs-file outputs.json" -ForegroundColor White


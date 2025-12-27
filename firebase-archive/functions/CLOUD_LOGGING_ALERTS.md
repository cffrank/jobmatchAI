# Cloud Logging Alerts Configuration

## Overview

This document provides alert configurations for monitoring security events in Cloud Functions. These alerts help detect and respond to suspicious activity, rate limit violations, and system errors.

## Prerequisites

1. Ensure Cloud Logging is enabled for your project
2. Ensure Cloud Monitoring is enabled
3. Set up notification channels (email, Slack, PagerDuty, etc.)

## Alert Configurations

### 1. Rate Limit Violations

**Purpose**: Detect when users are hitting rate limits, which could indicate abuse or automated attacks.

**Configuration**:
```yaml
displayName: "High Rate Limit Violations"
conditions:
  - displayName: "Rate limit exceeded threshold"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="SECURITY"
        jsonPayload.message=~"rate limit"
      aggregations:
        - alignmentPeriod: "300s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 10
      duration: "300s"
documentation:
  content: |
    ## Rate Limit Violations Alert

    This alert fires when more than 10 rate limit violations occur within 5 minutes.

    **Possible causes**:
    - User experiencing genuine rate limit (normal)
    - Automated attack or abuse attempt
    - Misconfigured client making too many requests

    **Actions**:
    1. Check the logs for the affected user ID
    2. Examine the request pattern and endpoint
    3. Verify if this is legitimate usage or abuse
    4. Consider blocking IP or user if malicious

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="SECURITY" AND jsonPayload.message=~"rate limit"' --limit 100
    ```
notificationChannels:
  - "projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
alertStrategy:
  autoClose: "3600s"
```

**Create with gcloud**:
```bash
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Rate Limit Violations" \
  --condition-display-name="Rate limit exceeded threshold" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_function" AND jsonPayload.eventType="SECURITY" AND jsonPayload.message=~"rate limit"' \
  --aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_RATE","crossSeriesReducer":"REDUCE_COUNT"}'
```

### 2. Failed Authentication Attempts

**Purpose**: Detect repeated failed login attempts, which could indicate credential stuffing or brute force attacks.

**Configuration**:
```yaml
displayName: "Multiple Failed Authentication Attempts"
conditions:
  - displayName: "High authentication failure rate"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="AUTH"
        jsonPayload.success=false
      aggregations:
        - alignmentPeriod: "300s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 5
      duration: "300s"
documentation:
  content: |
    ## Failed Authentication Attempts Alert

    This alert fires when more than 5 authentication failures occur within 5 minutes.

    **Possible causes**:
    - Credential stuffing attack
    - Brute force login attempt
    - User forgot password (legitimate)
    - Misconfigured client

    **Actions**:
    1. Identify the source IP addresses
    2. Check if failures are from same or different users
    3. Implement temporary IP blocks if attack detected
    4. Review authentication logs for patterns

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="AUTH" AND jsonPayload.success=false' --limit 100
    ```
```

### 3. Suspicious Redirect Attempts

**Purpose**: Detect attempts to use unauthorized redirect URLs, which could indicate phishing or open redirect exploitation attempts.

**Configuration**:
```yaml
displayName: "Rejected Redirect URLs"
conditions:
  - displayName: "Multiple redirect validation failures"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="SECURITY"
        jsonPayload.message=~"redirect"
        jsonPayload.severity="WARNING"
      aggregations:
        - alignmentPeriod: "300s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 3
      duration: "300s"
documentation:
  content: |
    ## Suspicious Redirect Attempts Alert

    This alert fires when more than 3 redirect validation failures occur within 5 minutes.

    **Possible causes**:
    - Attempted open redirect exploitation
    - Phishing attack attempt
    - Misconfigured client
    - Development/testing with wrong URLs

    **Actions**:
    1. Review the rejected redirect URLs
    2. Identify the source (user ID or IP)
    3. Check if URLs are malicious domains
    4. Update whitelist if legitimate new domain
    5. Block user/IP if malicious

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="SECURITY" AND jsonPayload.message=~"redirect"' --limit 50
    ```
```

### 4. OAuth Flow Failures

**Purpose**: Detect issues with the OAuth flow that could indicate attacks or system problems.

**Configuration**:
```yaml
displayName: "High OAuth Failure Rate"
conditions:
  - displayName: "OAuth failures threshold"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="OAUTH"
        jsonPayload.success=false
      aggregations:
        - alignmentPeriod: "600s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 10
      duration: "600s"
documentation:
  content: |
    ## OAuth Flow Failures Alert

    This alert fires when more than 10 OAuth failures occur within 10 minutes.

    **Possible causes**:
    - LinkedIn API issues
    - Token exchange failures
    - CSRF attack attempts (invalid state tokens)
    - Expired state tokens
    - System configuration issues

    **Actions**:
    1. Check LinkedIn API status
    2. Review OAuth error messages
    3. Verify LinkedIn credentials are correct
    4. Check for invalid/expired state tokens
    5. Review recent code changes

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="OAUTH" AND jsonPayload.success=false' --limit 50
    ```
```

### 5. Function Error Rate

**Purpose**: Detect high error rates in Cloud Functions that could indicate bugs, attacks, or system issues.

**Configuration**:
```yaml
displayName: "High Function Error Rate"
conditions:
  - displayName: "Function error threshold"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="FUNCTION"
        jsonPayload.success=false
      aggregations:
        - alignmentPeriod: "300s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 20
      duration: "300s"
documentation:
  content: |
    ## High Function Error Rate Alert

    This alert fires when more than 20 function errors occur within 5 minutes.

    **Possible causes**:
    - Code bugs or regressions
    - External API failures (OpenAI, LinkedIn, etc.)
    - Database connection issues
    - Resource exhaustion
    - Malicious input causing errors

    **Actions**:
    1. Check function logs for error details
    2. Identify which function(s) are failing
    3. Review recent deployments
    4. Check external service status
    5. Verify database connectivity
    6. Roll back if needed

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="FUNCTION" AND jsonPayload.success=false' --limit 100
    ```
```

### 6. Critical Security Events

**Purpose**: Immediately alert on any critical security events that require urgent attention.

**Configuration**:
```yaml
displayName: "Critical Security Events"
conditions:
  - displayName: "Critical severity events"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.severity="CRITICAL"
      aggregations:
        - alignmentPeriod: "60s"
          perSeriesAligner: "ALIGN_COUNT"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 0
      duration: "0s"
documentation:
  content: |
    ## Critical Security Events Alert

    This alert fires immediately when any critical security event occurs.

    **Possible causes**:
    - Detected attack attempt
    - Suspicious user activity
    - Security policy violation
    - System compromise indicators

    **Actions**:
    1. IMMEDIATE: Review the event details
    2. Identify the affected user/resource
    3. Assess if this is an active attack
    4. Take defensive actions (block user/IP)
    5. Investigate full scope of incident
    6. Consider incident response procedures

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.severity="CRITICAL"' --limit 50
    ```
alertStrategy:
  autoClose: "7200s"
```

### 7. Validation Failures

**Purpose**: Detect input validation failures that could indicate malicious input or client bugs.

**Configuration**:
```yaml
displayName: "High Input Validation Failure Rate"
conditions:
  - displayName: "Validation failures threshold"
    conditionThreshold:
      filter: |
        resource.type="cloud_function"
        jsonPayload.eventType="VALIDATION"
      aggregations:
        - alignmentPeriod: "300s"
          perSeriesAligner: "ALIGN_RATE"
          crossSeriesReducer: "REDUCE_COUNT"
      comparison: "COMPARISON_GT"
      thresholdValue: 15
      duration: "300s"
documentation:
  content: |
    ## High Validation Failure Rate Alert

    This alert fires when more than 15 validation failures occur within 5 minutes.

    **Possible causes**:
    - Malicious input injection attempts
    - Client bugs sending invalid data
    - API misuse
    - Data type mismatches

    **Actions**:
    1. Review the failed validations
    2. Identify which fields are failing
    3. Check if coming from single user/IP
    4. Assess if malicious or accidental
    5. Update validation rules if needed
    6. Block user/IP if attack detected

    **Query to investigate**:
    ```
    gcloud logging read 'jsonPayload.eventType="VALIDATION"' --limit 100
    ```
```

## Setting Up Notification Channels

### Create Email Notification Channel

```bash
gcloud alpha monitoring channels create \
  --display-name="Security Team Email" \
  --type=email \
  --channel-labels=email_address=security@yourcompany.com
```

### Create Slack Notification Channel

```bash
gcloud alpha monitoring channels create \
  --display-name="Security Slack Channel" \
  --type=slack \
  --channel-labels=url=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Create PagerDuty Notification Channel

```bash
gcloud alpha monitoring channels create \
  --display-name="PagerDuty Security" \
  --type=pagerduty \
  --channel-labels=service_key=YOUR_PAGERDUTY_KEY
```

### List Notification Channels

```bash
gcloud alpha monitoring channels list
```

## Deploy All Alerts (Terraform)

Create a `alerts.tf` file:

```hcl
# Rate Limit Violations
resource "google_monitoring_alert_policy" "rate_limit_violations" {
  display_name = "High Rate Limit Violations"
  combiner     = "OR"
  conditions {
    display_name = "Rate limit exceeded threshold"
    condition_threshold {
      filter          = "resource.type=\"cloud_function\" AND jsonPayload.eventType=\"SECURITY\" AND jsonPayload.message=~\"rate limit\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_COUNT"
      }
    }
  }
  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "3600s"
  }
}

# Add similar blocks for other alerts...
```

## Useful Log Queries

### View all security events in last hour

```bash
gcloud logging read 'jsonPayload.eventType="SECURITY" AND timestamp>="2024-01-01T00:00:00Z"' \
  --limit 100 \
  --format json
```

### View rate limit events by user

```bash
gcloud logging read 'jsonPayload.message=~"rate limit" AND jsonPayload.userId!=""' \
  --limit 50 \
  --format json | jq '.[] | {userId: .jsonPayload.userId, endpoint: .jsonPayload.endpoint, time: .timestamp}'
```

### View failed authentications with IP addresses

```bash
gcloud logging read 'jsonPayload.eventType="AUTH" AND jsonPayload.success=false' \
  --limit 50 \
  --format json | jq '.[] | {ip: .jsonPayload.ip, email: .jsonPayload.email, time: .timestamp}'
```

### View OAuth flow errors

```bash
gcloud logging read 'jsonPayload.eventType="OAUTH" AND jsonPayload.success=false' \
  --limit 50 \
  --format json | jq '.[] | {userId: .jsonPayload.userId, stage: .jsonPayload.stage, error: .jsonPayload.error}'
```

### View suspicious activity

```bash
gcloud logging read 'jsonPayload.severity="CRITICAL"' \
  --limit 50 \
  --format json
```

## Dashboard Configuration

Create a custom dashboard in Cloud Monitoring with these metrics:

1. **Function Invocation Rate**: Track calls to each function
2. **Error Rate**: Track function failures
3. **Rate Limit Hits**: Track rate limit violations
4. **Authentication Success/Failure**: Track auth events
5. **OAuth Flow Status**: Track OAuth success/failure
6. **Response Times**: Track function latency

## Maintenance

1. **Review alerts weekly**: Check for false positives and adjust thresholds
2. **Update whitelist**: Add new domains as needed to redirect validator
3. **Clean up old rate limit records**: Run cleanup function monthly
4. **Review logs**: Periodic security audit of logs
5. **Test alerts**: Trigger test alerts to verify notification channels

## Emergency Response Procedures

### If Rate Limit Alert Fires

1. Query logs to identify user/IP
2. Check if legitimate user or attack
3. If attack: Block IP in Cloud Armor
4. If legitimate: Contact user or increase limits

### If Failed Auth Alert Fires

1. Identify source IPs
2. Check if single user or multiple
3. If attack: Implement IP blocks
4. Monitor for escalation

### If Critical Security Event Fires

1. Immediately investigate the event
2. Assess if active attack
3. Take defensive actions
4. Escalate to security team
5. Consider incident response

## Testing Alerts

### Test Rate Limit Alert

```bash
# Make rapid requests to trigger rate limit
for i in {1..15}; do
  curl -X POST "https://REGION-PROJECT.cloudfunctions.net/generateApplication" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"jobId":"test"}' &
done
```

### Test Failed Auth Alert

Use invalid credentials multiple times to trigger failed auth events.

### Test Redirect Validation Alert

```bash
# Try multiple invalid redirect URLs
for url in "https://evil.com" "https://phishing.com" "javascript:alert(1)"; do
  curl "https://REGION-PROJECT.cloudfunctions.net/linkedInAuth" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"redirect_uri\":\"$url\"}"
done
```

## Resources

- [Cloud Logging Documentation](https://cloud.google.com/logging/docs)
- [Cloud Monitoring Alerting](https://cloud.google.com/monitoring/alerts)
- [Log-based Metrics](https://cloud.google.com/logging/docs/logs-based-metrics)
- [Notification Channels](https://cloud.google.com/monitoring/support/notification-options)

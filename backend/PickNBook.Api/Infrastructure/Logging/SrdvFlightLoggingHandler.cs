using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;

namespace PickNBook.Api.Infrastructure.Logging;

public class SrdvFlightLoggingHandler : DelegatingHandler
{
    private readonly ILogger<SrdvFlightLoggingHandler> _logger;

    public SrdvFlightLoggingHandler(ILogger<SrdvFlightLoggingHandler> logger)
    {
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var correlationId = CorrelationIdContext.CorrelationId;
        if (string.IsNullOrEmpty(correlationId))
        {
            correlationId = "NO-CORRELATION-ID";
        }

        string requestPayload = string.Empty;
        if (request.Content != null)
        {
            requestPayload = await request.Content.ReadAsStringAsync(cancellationToken);
        }

        // T2: Backend -> SRDV Request
        string formattedRequestPayload = FormatJson(requestPayload);
        _logger.LogInformation(
            "[{CorrelationId}] [T2] Backend -> SRDV Flight Request:\nMethod: {Method}\nURL: {Url}\nPayload:\n{Payload}\n--------------------------------------------------", 
            correlationId, request.Method, request.RequestUri, formattedRequestPayload);

        var stopwatch = Stopwatch.StartNew();
        HttpResponseMessage response;

        try
        {
            response = await base.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "[{CorrelationId}] HttpRequestException when calling SRDV Flight API after {ElapsedMs}ms", 
                correlationId, stopwatch.ElapsedMilliseconds);
            throw;
        }
        catch (TaskCanceledException ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "[{CorrelationId}] Timeout/Canceled when calling SRDV Flight API after {ElapsedMs}ms", 
                correlationId, stopwatch.ElapsedMilliseconds);
            throw;
        }
        
        stopwatch.Stop();

        string responsePayload = string.Empty;
        if (response.Content != null)
        {
            responsePayload = await response.Content.ReadAsStringAsync(cancellationToken);
        }
        
        // T3: SRDV -> Backend Response
        string formattedResponsePayload = FormatJson(responsePayload);
        _logger.LogInformation(
            "[{CorrelationId}] [T3] SRDV Flight -> Backend Response:\nStatus: {StatusCode}\nTime: {ElapsedMs}ms\nPayload:\n{Payload}\n==================================================", 
            correlationId, response.StatusCode, stopwatch.ElapsedMilliseconds, formattedResponsePayload);

        return response;
    }

    private string FormatJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return json;
        try
        {
            var parsedJson = JsonDocument.Parse(json);
            return JsonSerializer.Serialize(parsedJson, new JsonSerializerOptions { WriteIndented = true });
        }
        catch
        {
            return json; // Return original if not valid JSON
        }
    }
}

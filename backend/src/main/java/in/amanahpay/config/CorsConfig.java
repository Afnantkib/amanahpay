package in.amanahpay.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
  private static final String LOCAL_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173";

  @Bean
  CorsFilter corsFilter(@Value("${CORS_ORIGINS:" + LOCAL_ORIGINS + "}") String origins) {
    List<String> allowedOrigins = Arrays.stream(origins.split(","))
        .map(String::trim)
        .filter(origin -> !origin.isEmpty())
        .map(origin -> origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin)
        .toList();

    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(allowedOrigins);
    config.addAllowedOriginPattern("http://*.nip.io*");
    config.addAllowedOriginPattern("https://*.nip.io*");
    config.addAllowedOriginPattern("http://*.sslip.io*");
    config.addAllowedOriginPattern("https://*.sslip.io*");
    config.addAllowedOriginPattern("http://*.duckdns.org*");
    config.addAllowedOriginPattern("https://*.duckdns.org*");
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return new CorsFilter(source);
  }
}

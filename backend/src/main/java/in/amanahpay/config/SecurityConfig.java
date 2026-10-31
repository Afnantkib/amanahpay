package in.amanahpay.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

@Configuration
public class SecurityConfig {
  private static final RequestMatcher PUBLIC_API = request -> {
    String path = request.getRequestURI();
    return path.startsWith("/api/v1/auth/")
        || path.startsWith("/api/v1/customer/auth/")
        || path.matches("/api/v1/customer/link/[^/]+/otp/request")
        || path.equals("/api/v1/customer/otp/verify")
        || path.equals("/api/health")
        || path.equals("/actuator/health")
        || path.equals("/error");
  };

  @Bean
  WebSecurityCustomizer publicRoutes() {
    return web -> web.ignoring().requestMatchers(PUBLIC_API);
  }

  @Bean
  SecurityFilterChain filter(HttpSecurity http, @Value("${amanah.jwt-secret}") String secret) throws Exception {
    return http.csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(e -> e.authenticationEntryPoint((request, response, error) ->
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
        .authorizeHttpRequests(a -> a.requestMatchers(PUBLIC_API).permitAll().anyRequest().authenticated())
        .addFilterBefore(new TokenFilter(secret), UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  static class TokenFilter extends OncePerRequestFilter {
    private final String secret;

    TokenFilter(String secret) { this.secret = secret; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
      String header = request.getHeader("Authorization");
      if (header != null && header.startsWith("Bearer ")) {
        try {
          var claims = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret)))
              .build().parseSignedClaims(header.substring(7)).getPayload();
          request.setAttribute("amanah.userId", claims.getSubject());
          request.setAttribute("amanah.role", claims.get("role"));
          request.setAttribute("amanah.scope", claims.get("scope"));
          request.setAttribute("amanah.planId", claims.get("planId"));
          request.setAttribute("amanah.customerId", claims.get("customerId"));
          request.setAttribute("amanah.customerAccountId", claims.get("customerAccountId"));
          var authentication = new UsernamePasswordAuthenticationToken(claims.getSubject(), null,
              List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role"))));
          SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ignored) {
          // Invalid tokens remain unauthenticated; protected routes will reject them.
        }
      }
      chain.doFilter(request, response);
    }
  }
}

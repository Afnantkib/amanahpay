package in.amanahpay.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OtpMailService {
  private static final Logger log = LoggerFactory.getLogger(OtpMailService.class);
  private final JavaMailSender primary;

  @Value("${MAIL_FROM:}") private String from;

  public OtpMailService(JavaMailSender primary) { this.primary=primary; }

  public void send(String recipient,String subject,String body) {
    try {
      primary.send(message(recipient, subject, body));
    } catch (RuntimeException failure) {
      log.error("OTP email delivery failed through the configured SMTP provider.");
      throw new IllegalStateException("OTP email delivery failed", failure);
    }
  }

  private SimpleMailMessage message(String recipient, String subject, String body) {
    SimpleMailMessage message = new SimpleMailMessage();
    if (from != null && !from.isBlank()) message.setFrom(from);
    message.setTo(recipient);
    message.setSubject(subject);
    message.setText(body);
    return message;
  }
}

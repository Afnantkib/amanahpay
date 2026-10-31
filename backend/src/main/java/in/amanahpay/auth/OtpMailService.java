package in.amanahpay.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import java.util.Arrays;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OtpMailService {
  private static final Logger log=LoggerFactory.getLogger(OtpMailService.class);
  private final JavaMailSender primary;
  @Value("${MAIL_FROM:}") private String from;
  @Value("${MAIL_FALLBACK_HOST:127.0.0.1}") private String fallbackHost;
  @Value("${MAIL_FALLBACK_PORT:1025}") private int fallbackPort;
  @Value("${spring.profiles.active:}") private String profiles;
  public OtpMailService(JavaMailSender primary) { this.primary=primary; }

  @Async
  public void send(String recipient,String subject,String body) {
    try { primary.send(message(recipient,subject,body)); return; }
    catch (RuntimeException primaryFailure) {
      if (!Arrays.asList(profiles.split(",")).contains("dev")) { log.error("OTP email delivery failed for configured provider"); return; }
      try {
        JavaMailSenderImpl fallback=new JavaMailSenderImpl();fallback.setHost(fallbackHost);fallback.setPort(fallbackPort);fallback.setProtocol("smtp");
        Properties props=fallback.getJavaMailProperties();props.put("mail.smtp.auth","false");props.put("mail.smtp.starttls.enable","false");props.put("mail.smtp.connectiontimeout","3000");props.put("mail.smtp.timeout","3000");
        fallback.send(message(recipient,subject,body));
        System.out.println("DEV-ONLY: OTP email captured by local SMTP fallback.");
      } catch (RuntimeException fallbackFailure) {
        log.error("DEV-ONLY: configured email provider and local SMTP fallback both failed");
      }
    }
  }
  private SimpleMailMessage message(String recipient,String subject,String body){SimpleMailMessage m=new SimpleMailMessage();if(from!=null&&!from.isBlank())m.setFrom(from);m.setTo(recipient);m.setSubject(subject);m.setText(body);return m;}
}

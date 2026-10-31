package in.amanahpay;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
@EnableAsync @SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class) public class AmanahPayApplication { public static void main(String[] args){SpringApplication.run(AmanahPayApplication.class,args);} }

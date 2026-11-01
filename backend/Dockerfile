FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build --chown=10001:10001 /app/target/amanahpay-0.1.0.jar app.jar
ENV HOME=/tmp
EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java","-jar","/app/app.jar"]

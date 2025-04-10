import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBIT_HOST;

// Evento: Usuario creado
export async function userCreatedEvent(user) {
    const RABBITMQ_EXCHANGE = "user_event";
    const RABBITMQ_ROUTING_KEY = "user.created";

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

        const message = JSON.stringify(user);
        channel.publish(RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEY, Buffer.from(message));

        console.log(`[x] Exchange "${RABBITMQ_EXCHANGE}", routing key "${RABBITMQ_ROUTING_KEY}": ${message}`);

        setTimeout(() => connection.close(), 500);
    } catch (error) {
        console.error('Error publicando el evento user.created:', error.message);
    }
}

// Evento: Cambio de contraseña
export async function userPasswordChangedEvent(payload) {
    const RABBITMQ_EXCHANGE = "user_event";
    const RABBITMQ_ROUTING_KEY = "user.password.changed";

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

        const message = JSON.stringify(payload);
        channel.publish(RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEY, Buffer.from(message));

        console.log(`[x] Exchange "${RABBITMQ_EXCHANGE}", routing key "${RABBITMQ_ROUTING_KEY}": ${message}`);

        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error publicando el evento de cambio de contraseña:', error.message);
    }
}

// Evento: Cambio de contraseña sin confirmar
export async function userPasswordChangedEventConfirm(payload) {
    const RABBITMQ_EXCHANGE = "users_event";
    const RABBITMQ_ROUTING_KEY = "user.passwords.changed";

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

        const message = JSON.stringify(payload);
        channel.publish(RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEY, Buffer.from(message));

        console.log(`[x] Exchange "${RABBITMQ_EXCHANGE}", routing key "${RABBITMQ_ROUTING_KEY}": ${message}`);

        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error publicando el evento de cambio de contraseña:', error.message);
    }
}


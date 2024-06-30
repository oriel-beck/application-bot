import { container } from "@sapphire/framework";

export default class CooldownManager {
    name = "cooldown";
    redis = container.redis;
    private userCooldownKey = "share-your-bot-cooldown";
    private stickyMessageKey = "share-your-bot-sticky-message"
    // 86400 - 1d
    setCooldown(userId: string, time = 86400) {
        return this.redis.setex(`${this.userCooldownKey}-${userId}`, time, 1);
    }

    getCooldown(userId: string) {
        return this.redis.get(`${this.userCooldownKey}-${userId}`)
    }

    ttl(userId: string) {
        return this.redis.ttl(`${this.userCooldownKey}-${userId}`);
    }

    deleteCooldown(userId: string) {
        return this.redis.del(`${this.userCooldownKey}-${userId}`)
    }

    setMessage(messageId: string) {
        return this.redis.set(this.stickyMessageKey, messageId);
    }

    getMessage() {
        return this.redis.get(this.stickyMessageKey);
    }
}
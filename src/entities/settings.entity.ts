import { Column, Entity, PrimaryColumn } from 'typeorm';
import { APIMessageComponentEmoji } from 'discord.js';

@Entity()
export class BDFDSetting {
  /**
   * The guild ID for this configuration
   */
  @PrimaryColumn({ type: 'bigint', unique: true })
  guildid: bigint;

  /**
   * The state of the applications
   */
  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  // TODO: implement this
  // Channels config (application specific overrides this)
  /**
   * The channel to send new applications in
   */
  @Column({ type: 'bigint', nullable: true })
  pendingchannel: bigint | null;

  /**
   * The channel to send denied applications in
   */
  @Column({ type: 'bigint', nullable: true })
  deniedchannel: bigint | null;

  /**
   * The channel to send accepted applications in
   */
  @Column({ type: 'bigint', nullable: true })
  acceptedchannel: bigint | null;

  /**
   * The channel to send the acceptance message (if one is set) (application specific overrides this)
   */
  @Column({ type: 'bigint', nullable: true })
  acceptedmessagechannel: bigint | null;

  /**
   * The channel reports about users that cheat in applications is sent to (application specific overrides this)
   */
  @Column({ type: 'bigint', nullable: true })
  reportschannel: bigint | null;

  // Roles config
  /**
   * The manager role, allows running manager commands
   */
  @Column({ type: 'bigint', nullable: true })
  managerrole: bigint | null;

  /**
   * What role(s) to add to the user once accepted
   */
  @Column({ type: 'bigint', default: '{}', array: true })
  acceptedrole: bigint[];

  // Colors
  /**
   * The embed color for pending applications (application specific overrides this)
   */
  @Column({ type: 'decimal', nullable: true })
  pendingcolor: number | null;

  /**
   * The embed color for denied applications (application specific overrides this)
   */
  @Column({ type: 'decimal', nullable: true })
  deniedcolor: number | null;

  /**
   * The embed color for accepted applications (application specific overrides this)
   */
  @Column({ type: 'decimal', nullable: true })
  acceptedcolor: number | null;

  /**
   * The embed color for all other embeds (application specific overrides this partially)
   */
  @Column({ type: 'decimal', nullable: true })
  primarycolor: number | null;

  // Emojis
  /**
   * The prev page emoji (application specific overrides this)
   */
  @Column({ type: 'json', nullable: true })
  prevemoji: APIMessageComponentEmoji | null;

  /**
   * The next page emoji (application specific overrides this)
   */
  @Column({ type: 'json', nullable: true })
  nextemoji: APIMessageComponentEmoji | null;

  // Messages
  /**
   * The message to send in 'acceptedmessagechannel' once a user is accepted (application specific overrides this)
   */
  @Column({ type: 'text', nullable: true })
  welcomemsg: string | null;
}

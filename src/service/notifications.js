import { Notification } from "../model/Notification.js";
import { User } from "../model/User.js";

export async function createNotifications(recipientIds, notification, session) {
  const uniqueRecipientIds = [
    ...new Map(
      recipientIds
        .filter(Boolean)
        .map((id) => [id.toString(), id])
    ).values(),
  ];
  if (!uniqueRecipientIds.length) return;

  const documents = uniqueRecipientIds.map((recipient) => ({
    ...notification,
    recipient,
  }));
  if (session) {
    await Notification.insertMany(documents, { session });
    return;
  }
  await Notification.insertMany(documents);
}

export async function notifyAdmins(notification, session) {
  const query = User.find({ role: "admin", isActive: true }).select("_id");
  if (session) query.session(session);
  const admins = await query;
  await createNotifications(
    admins.map((admin) => admin._id),
    notification,
    session
  );
}

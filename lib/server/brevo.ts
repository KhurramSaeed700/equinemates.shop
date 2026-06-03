type BrevoContactSyncResult =
  | {
      enabled: false;
      synced: false;
    }
  | {
      enabled: true;
      synced: true;
      contactId?: number;
    }
  | {
      enabled: true;
      synced: false;
      error: string;
    };

type BrevoCreateContactResponse = {
  id?: number;
};

const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";

function getBrevoApiKey() {
  return process.env.BREVO_API_KEY?.trim() ?? "";
}

function getBrevoNewsletterListIds() {
  const rawListId = process.env.BREVO_NEWSLETTER_LIST_ID?.trim();

  if (!rawListId) {
    return [];
  }

  const listId = Number(rawListId);
  return Number.isInteger(listId) && listId > 0 ? [listId] : [];
}

export function isBrevoNewsletterConfigured() {
  return Boolean(getBrevoApiKey());
}

export async function syncNewsletterSubscriberToBrevo(
  email: string,
): Promise<BrevoContactSyncResult> {
  const apiKey = getBrevoApiKey();

  if (!apiKey) {
    return { enabled: false, synced: false };
  }

  try {
    const response = await fetch(BREVO_CONTACTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        emailBlacklisted: false,
        listIds: getBrevoNewsletterListIds(),
        updateEnabled: true,
      }),
    });

    const responseText = await response.text();
    let payload: BrevoCreateContactResponse = {};

    try {
      payload = responseText
        ? (JSON.parse(responseText) as BrevoCreateContactResponse)
        : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      return {
        enabled: true,
        synced: false,
        error:
          responseText ||
          `Brevo contact sync failed with status ${response.status}.`,
      };
    }

    return {
      enabled: true,
      synced: true,
      contactId: payload.id,
    };
  } catch (error) {
    return {
      enabled: true,
      synced: false,
      error:
        error instanceof Error
          ? error.message
          : "Brevo contact sync failed.",
    };
  }
}

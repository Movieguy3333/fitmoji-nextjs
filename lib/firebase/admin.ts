import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const FIREBASE_ADMIN_APP_NAME = "fitmoji-admin";

const REQUIRED_ENV_KEYS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_STORAGE_BUCKET",
] as const;

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
};

export class FirebaseAdminConfigError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Missing Firebase Admin environment variable${missingKeys.length === 1 ? "" : "s"}: ${missingKeys.join(
        ", ",
      )}`,
    );
    this.name = "FirebaseAdminConfigError";
    this.missingKeys = missingKeys;
  }
}

export function getFirebaseAdminConfigStatus(): {
  ready: boolean;
  missingKeys: string[];
} {
  const missingKeys: string[] = [
    ...REQUIRED_ENV_KEYS.filter((key) => !process.env[key]),
  ];

  if (!readFirebasePrivateKey()) {
    missingKeys.push("FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64");
  }

  return {
    ready: missingKeys.length === 0,
    missingKeys,
  };
}

function getFirebaseAdminConfig(): FirebaseAdminConfig {
  const status = getFirebaseAdminConfigStatus();

  if (!status.ready) {
    throw new FirebaseAdminConfigError(status.missingKeys);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: readFirebasePrivateKey()!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  };
}

function readFirebasePrivateKey() {
  const base64PrivateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64;

  if (base64PrivateKey) {
    return Buffer.from(base64PrivateKey, "base64")
      .toString("utf8")
      .replace(/\\n/g, "\n");
  }

  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  const existingApp = getApps().find(
    (app) => app.name === FIREBASE_ADMIN_APP_NAME,
  );

  if (existingApp) {
    return existingApp;
  }

  const config = getFirebaseAdminConfig();

  return initializeApp(
    {
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      storageBucket: config.storageBucket,
    },
    FIREBASE_ADMIN_APP_NAME,
  );
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminStorageBucket() {
  return getStorage(getFirebaseAdminApp()).bucket();
}

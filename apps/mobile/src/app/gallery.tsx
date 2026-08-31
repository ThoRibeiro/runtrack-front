import { Gallery } from '@runtrack/ui';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * The design system gallery (§3), reachable at `/gallery`.
 *
 * It is a development tool, not a screen of the product: in a production build
 * the route redirects rather than existing, so the whole gallery — and the
 * deliberately ugly strings in it — is tree-shaken out of the shipped bundle.
 */
export default function GalleryRoute(): ReactNode {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

"use client";

import { useState, useEffect } from "react";
import { SDK } from '@1inch/cross-chain-sdk'
import {main} from '@/lib/sdk'

export default function SDKPage() {
  const initSDK = () => {
    main();
  };

  useEffect(() => {
    initSDK();
  }, []);

  return <div>
    page.
  </div>;
}

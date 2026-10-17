"use client";

import { useEffect } from "react";
import { actionTouchLastVisit } from "@/app/tasks/actions";

/** Sets the last-visit cookie after paint (cookies cannot be set during RSC render). */
export function TouchLastVisit() {
  useEffect(() => {
    void actionTouchLastVisit();
  }, []);
  return null;
}

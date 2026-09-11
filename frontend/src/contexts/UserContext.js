/* eslint-disable */
import React, { createContext, useCallback, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(() => {
    const emptyProfile = {
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      profileImage: null,
      location: ''
    };

    if (typeof window === "undefined") {
      return emptyProfile;
    }

    try {
      const storedUser = JSON.parse(window.localStorage.getItem("user") || window.sessionStorage.getItem("user") || "{}");
      return storedUser && typeof storedUser === "object"
        ? { ...emptyProfile, ...storedUser }
        : emptyProfile;
    } catch {
      return emptyProfile;
    }
  });

  const updateUserData = useCallback((newData) => {
    setUserData(prev => {
      const nextUserData = { ...prev, ...newData };

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("user", JSON.stringify(nextUserData));
          window.sessionStorage.setItem("user", JSON.stringify(nextUserData));
        } catch {
          // Ignore storage failures and keep the in-memory profile updated.
        }
      }

      return nextUserData;
    });
  }, []);

  return (
    <UserContext.Provider value={{ userData, updateUserData }}>
      {children}
    </UserContext.Provider>
  );
};

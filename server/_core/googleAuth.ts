    try {
      const clientDb = await db.getDb();
      if (clientDb) {
        try {
          await clientDb.insert(oauthTransactions).values({
            requestId: oauthRequestId,
            stateHash: decodedState.stateHash,
            status: "initiated",
            expiresAt: new Date(Date.now() + STATE_TTL_MS),
          }).onConflictDoNothing();
          console.log(`[GoogleAuth] [${oauthRequestId}] OAuth transaction successfully persisted in PostgreSQL`);
        } catch (dbErr) {
          console.warn(`[GoogleAuth] [${oauthRequestId}] Non-fatal DB error during transaction insert — proceeding with OAuth redirect:`, dbErr);
        }
      }

      const authUrl = buildGoogleAuthUrl(state);
      console.log(`[GoogleAuth] [${oauthRequestId}] Redirecting to Google consent screen`);
      res.redirect(302, authUrl);
    } catch (err) {
      console.error(`[GoogleAuth] [${oauthRequestId}] Critical OAuth initiation storage failure:`, err);
      res.status(503).json({ 
        error: "OAuth temporarily unavailable", 
        code: "OAUTH_STORAGE_UNAVAILABLE",
        requestId: oauthRequestId 
      });
    }

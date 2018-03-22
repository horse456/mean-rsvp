// src/app/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AUTH_CONFIG } from './auth.config';
import * as auth0 from 'auth0-js';

@Injectable()
export class AuthService {
  // Create Auth0 web auth instance
  private _auth0 = new auth0.WebAuth({
    clientID: AUTH_CONFIG.CLIENT_ID,
    domain: AUTH_CONFIG.CLIENT_DOMAIN,
    responseType: 'token',
    redirectUri: AUTH_CONFIG.AUDIENCE,
    scope: AUTH_CONFIG.SCOPE
  });
  userProfile: any;
  // Create a stream of logged in status to communicate throughout app
  loggedIn: boolean;
  loggedIn$ = new BehaviorSubject<boolean>(this.loggedIn);

  isAdmin: boolean;

  constructor(private router: Router) {
    // If authenticated, set local profile property
    // admin status, and update login status subject.
    // If not authenticated but there are still items
    // in localStorage, log out.
    const IsProfile = localStorage.getItem('profile');

    if (this.tokenValid) {
      this.userProfile = JSON.parse(IsProfile);
      this.isAdmin = localStorage.getItem('isAdmin') === 'true';
      this.setLoggedIn(true);
    } else if (!this.tokenValid && IsProfile) {
      this.logout();
    }
   }

   setLoggedIn(value: boolean) {
     // Update login status subject
     this.loggedIn$.next(value);
     this.loggedIn = value;
   }

   login(redirect?: string) {
     // Set redirect after login
     const _redirect = redirect ? redirect :this.router.url;
     localStorage.setItem('authRedirct', _redirect);
     // Auth0 authorize request
     this._auth0.authorize();
   }

   handleAuth() {
     // When Auth0 hash parsed, get profile
     this._auth0.parseHash ((err, authResult) => {
       if (authResult && authResult.accessToken) {
         window.location.hash = '';
         this._getProfile(authResult);
       } else if (err) {
         this._clearRedirect();
         this.router.navigate(['/']);
         console.error(`Error authenticating: ${err.error}`);
       }
     });
   }

   private _getProfile(authResult) {
     // Use access token to retrieve user's profile and set session
     this._auth0.client.userInfo(authResult.accessToken, (err, profile) => {
       if (profile) {
         this._setSession(authResult, profile);
         this.router.navigate([localStorage.getItem('authRedirect') || '/']);
         this._redirect()
         this._clearRedirect();
       } else if (err) {
         console.error(`Error authenticating: ${err.error}`);
       }
     });
   }

   private _redirect() {
     // Redirect with or without 'tab' query paramter
     // Note: does not support additional params besides 'tab'
     const fullRedirect = decodeURI(localStorage.getItem('authRedirect'));
     const redirectArr = fullRedirect.split('?tab=');
     const navArr = [redirectArr[0] || '/'];
     const tabObj = redirectArr[1] ? { queryParams: { tab: redirectArr[1] }} : null;

     if (!tabObj) {
       this.router.navigate(navArr);
     } else {
       this.router.navigate(navArr, tabObj);
     }
   }

   private _setSession(authResult, profile) {
     // Save session data and update login status subject
     const expiresAt = JSON.stringify((authResult.expiresIn * 1000) + Date.now());
     // set tokens and expiration in localStorage and props
     localStorage.setItem('access_token', authResult.accessToken);
     localStorage.setItem('expires_at', expiresAt);
     localStorage.setItem('profile', JSON.stringify(profile))

     this.isAdmin = this._checkAdmin(profile);
     localStorage.setItem('isAdmin', this.isAdmin.toString());

     this.userProfile = profile;
     // Update login status in loggedIn$ stream
     this.setLoggedIn(true);
   }

   private _checkAdmin(profile) {
     // Check if the user has admin role
     const roles = profile[AUTH_CONFIG.NAMESPACE] || [];
     return roles.indexOf('admin') > -1;
   }

   private _clearRedirect() {
     // Remove redirect from localStorage
     localStorage.removeItem('authRedirect');
   }

   logout() {
     // Ensure all auth items removed from localStorage
     localStorage.removeItem('access_token');
     localStorage.removeItem('profile');
     localStorage.removeItem('expires_at');
     localStorage.removeItem('authRedirect');

     localStorage.removeItem('isAdmin');
     this._clearRedirect();
     // Reset local properties, update loggedIn$ stream
     this.userProfile = undefined;
     this.isAdmin = undefined;
     this.setLoggedIn(false);
     // Return to homepage
     this.router.navigate(['/']);
   }

   get tokenValid(): boolean {
     // Check if current time is past access token's expiration
     const expiresAt = JSON.parse(localStorage.getItem('expires_at'));
     return Date.now() < expiresAt;
   }



}

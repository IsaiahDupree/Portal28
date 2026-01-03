# Page snapshot

```yaml
- generic [ref=e3]:
  - link "P28 Portal28" [ref=e5] [cursor=pointer]:
    - /url: /
    - generic [ref=e6]: P28
    - text: Portal28
  - generic [ref=e7]:
    - generic [ref=e8]:
      - heading "Enter the room." [level=3] [ref=e9]
      - paragraph [ref=e10]: Sign in to access your courses, community, and content.
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Email
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "Email" [ref=e18]:
            - /placeholder: you@domain.com
      - generic [ref=e19]:
        - text: Password
        - generic [ref=e20]:
          - img [ref=e21]
          - textbox "Password" [ref=e24]:
            - /placeholder: ••••••••
      - button "Sign in" [ref=e25]
      - link "Forgot your password?" [ref=e27] [cursor=pointer]:
        - /url: /forgot-password
      - generic [ref=e28]: or
      - button "Sign in with magic link" [active] [ref=e29]
      - paragraph [ref=e30]:
        - text: Don't have an account?
        - link "Sign up" [ref=e31] [cursor=pointer]:
          - /url: /signup
  - paragraph [ref=e32]:
    - link "Back to home" [ref=e33] [cursor=pointer]:
      - /url: /
      - img [ref=e34]
      - text: Back to home
```
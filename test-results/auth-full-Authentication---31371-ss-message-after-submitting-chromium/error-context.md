# Page snapshot

```yaml
- generic [ref=e3]:
  - link "P28 Portal28" [ref=e5] [cursor=pointer]:
    - /url: /
    - generic [ref=e6]: P28
    - text: Portal28
  - generic [ref=e7]:
    - generic [ref=e8]:
      - heading "Forgot your password?" [level=3] [ref=e9]
      - paragraph [ref=e10]: No worries, we'll send you reset instructions
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Email
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "Email" [ref=e18]:
            - /placeholder: you@domain.com
      - button "Send reset link" [ref=e19]
      - paragraph [ref=e20]:
        - text: Remember your password?
        - link "Sign in" [ref=e21] [cursor=pointer]:
          - /url: /login
  - paragraph [ref=e22]:
    - link "Back to home" [ref=e23] [cursor=pointer]:
      - /url: /
      - img [ref=e24]
      - text: Back to home
```
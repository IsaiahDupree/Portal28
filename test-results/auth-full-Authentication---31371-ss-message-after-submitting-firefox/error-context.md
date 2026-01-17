# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "P28 Portal28" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e7]: P28
      - generic [ref=e8]: Portal28
    - generic [ref=e9]:
      - generic [ref=e10]:
        - heading "Forgot your password?" [level=3] [ref=e11]
        - paragraph [ref=e12]: No worries, we'll send you reset instructions
      - generic [ref=e14]:
        - generic [ref=e15]:
          - text: Email
          - generic [ref=e16]:
            - img [ref=e17]
            - textbox "Email" [ref=e20]:
              - /placeholder: you@domain.com
              - text: test@example.com
        - button "Sending..." [disabled]
        - paragraph [ref=e21]:
          - text: Remember your password?
          - link "Sign in" [ref=e22] [cursor=pointer]:
            - /url: /login
    - paragraph [ref=e23]:
      - link "Back to home" [ref=e24] [cursor=pointer]:
        - /url: /
        - img [ref=e25]
        - text: Back to home
  - alert [ref=e28]
```
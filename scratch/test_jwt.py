import jwt
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJlbWFpbCI6ImFkbWluQHBpenplcmlhLmNvbSIsInJvbCI6ImFkbWluIiwiZXhwIjoxNzc3NjUyMjcyfQ.BSdIHhMjfv5hWEB_xvVXeyjzfxzySxQXtdSuEFlfV3c"
secret = "12345"
try:
    decoded = jwt.decode(token, secret, algorithms=["HS256"])
    print("SUCCESS:", decoded)
except Exception as e:
    print("FAILURE:", e)

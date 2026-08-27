
## Live route verification

The live `https://zylobridge.com/jobs` page exposed real links `/jobs/8`, `/jobs/6`, and `/jobs/3`. A direct live request to `https://api.zylobridge.com/api/trpc/jobs.getById?input={"json":{"id":3}}` returned HTTP 200 JSON with job ID 3, title `Mason needed`, vocation `mason_bricklayer`, location `Cape Town`, budget `200.00`, `status: open`, and nullable organization/project/location fields. The live `/jobs/3` route rendered the job title, vocation, location, budget, deadline, expired status derived from the passed deadline, description, skills, and safe marketplace support copy rather than the generic load error.

The browser session rendered the professional shell but the final CTA correctly remained non-applicable for that session because no authenticated professional identity was available to apply. This is expected and does not block public job-detail rendering.
